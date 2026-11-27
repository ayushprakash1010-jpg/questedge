import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface SignalMessage {
  id: number;
  sender: string; // 'interviewer' | 'candidate'
  type: string;   // 'ready' | 'offer' | 'answer' | 'candidate' | 'bye' | 'chat'
  payload: any;
  timestamp: number;
}

interface RoomSignalState {
  lastActive: number;
  seq: number;
  messages: SignalMessage[];
}

const MAX_ROOMS = 500;
const ALLOWED_SENDERS = new Set(['interviewer', 'candidate']);
const ALLOWED_TYPES = new Set(['ready', 'offer', 'answer', 'candidate', 'bye', 'chat']);

@Injectable()
export class WebRtcSignalingService {
  private readonly logger = new Logger(WebRtcSignalingService.name);
  private rooms = new Map<string, RoomSignalState>();

  constructor(@Optional() private readonly prisma?: PrismaService) {
    // Periodically clean up inactive rooms (> 2 hours old)
    const timer = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    if (timer.unref) timer.unref();
  }

  private async assertValidRoom(cleanRoom: string) {
    if (!cleanRoom || !/^[a-z0-9_-]{4,80}$/.test(cleanRoom)) {
      throw new BadRequestException('Invalid video room identifier');
    }
    if (this.prisma && !this.rooms.has(cleanRoom)) {
      const exists = await this.prisma.videoInterview.findFirst({
        where: {
          roomName: cleanRoom,
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
        select: { id: true },
      });
      if (!exists) {
        throw new NotFoundException('Active video room not found');
      }
    }
  }

  async sendSignal(roomId: string, sender: string, type: string, payload: any): Promise<{ ok: boolean; id: number }> {
    if (!ALLOWED_SENDERS.has(sender) || !ALLOWED_TYPES.has(type)) {
      throw new BadRequestException('Invalid signal sender or type');
    }
    const cleanRoom = (roomId || '').toLowerCase().trim();
    await this.assertValidRoom(cleanRoom);
    let room = this.rooms.get(cleanRoom);
    if (!room) {
      if (this.rooms.size >= MAX_ROOMS) {
        this.cleanup();
        if (this.rooms.size >= MAX_ROOMS) {
          const oldestKey = this.rooms.keys().next().value;
          if (oldestKey) this.rooms.delete(oldestKey);
        }
      }
      room = { lastActive: Date.now(), seq: 0, messages: [] };
      this.rooms.set(cleanRoom, room);
    }

    room.lastActive = Date.now();
    room.seq += 1;

    const message: SignalMessage = {
      id: room.seq,
      sender,
      type,
      payload,
      timestamp: Date.now(),
    };

    room.messages.push(message);

    // Keep the last 150 signaling messages per room
    if (room.messages.length > 150) {
      room.messages.splice(0, room.messages.length - 150);
    }

    return { ok: true, id: message.id };
  }

  getSignals(roomId: string, sender: string, sinceId = 0): SignalMessage[] {
    const cleanRoom = roomId.toLowerCase().trim();
    const room = this.rooms.get(cleanRoom);
    if (!room) return [];

    room.lastActive = Date.now();
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    // Filter messages where sender is NOT the requester, message id > sinceId, and not expired (> 5 min)
    return room.messages.filter(
      (m) => m.id > sinceId && m.sender !== sender && m.timestamp > fiveMinutesAgo
    );
  }

  clearRoom(roomId: string) {
    const cleanRoom = roomId.toLowerCase().trim();
    this.rooms.delete(cleanRoom);
  }

  private cleanup() {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const [roomId, data] of this.rooms.entries()) {
      if (data.lastActive < cutoff) {
        this.rooms.delete(roomId);
      }
    }
  }
}
