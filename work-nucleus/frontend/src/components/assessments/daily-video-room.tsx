"use client";

import React from "react";
import { NativeWebRtcRoom } from "./native-webrtc-room";

interface DailyVideoRoomProps {
  roomName?: string;
  roomUrl?: string;
  displayName?: string;
  onLeave?: () => void;
  isAdmin?: boolean;
}

export function DailyVideoRoom({
  roomName,
  roomUrl,
  displayName,
  onLeave,
  isAdmin = false,
}: DailyVideoRoomProps) {
  return (
    <NativeWebRtcRoom
      roomName={roomName || "questedge-room"}
      roomUrl={roomUrl}
      displayName={displayName}
      isAdmin={isAdmin}
      onLeave={onLeave}
    />
  );
}
