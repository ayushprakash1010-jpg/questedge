"use client";

import React from "react";
import { NativeWebRtcRoom } from "./native-webrtc-room";

interface JitsiMeetRoomProps {
  roomName?: string;
  roomUrl?: string;
  displayName?: string;
  onLeave?: () => void;
  isAdmin?: boolean;
}

/**
 * Backwards-compatible export mapping to NativeWebRtcRoom
 */
export function JitsiMeetRoom(props: JitsiMeetRoomProps) {
  return (
    <NativeWebRtcRoom
      roomName={props.roomName || "questedge-room"}
      roomUrl={props.roomUrl}
      displayName={props.displayName}
      onLeave={props.onLeave}
      isAdmin={props.isAdmin}
    />
  );
}
