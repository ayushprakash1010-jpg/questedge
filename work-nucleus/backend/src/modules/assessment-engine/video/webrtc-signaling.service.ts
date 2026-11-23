import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class WebRtcSignalingService {
  private readonly logger = new Logger(WebRtcSignalingService.name);
  private rooms = new Map<string, RoomSignalState>();

  constructor() {
    // Periodically clean up inactive rooms (> 2 hours old)
    const timer = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    if (timer.unref) timer.unref();
  }

  sendSignal(roomId: string, sender: string, type: string, payload: any): { ok: boolean; id: number } {
    const cleanRoom = roomId.toLowerCase().trim();
    let room = this.rooms.get(cleanRoom);
    if (!room) {
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

    // Filter messages where sender is NOT the requester, and message id > sinceId
    return room.messages.filter((m) => m.id > sinceId && m.sender !== sender);
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
