"use client";

import React from "react";
import { DailyVideoRoom } from "./daily-video-room";

interface JitsiMeetRoomProps {
  roomName?: string;
  roomUrl?: string;
  displayName?: string;
  onLeave?: () => void;
  isAdmin?: boolean;
}

/**
 * Backwards-compatible export mapping to DailyVideoRoom
 */
export function JitsiMeetRoom(props: JitsiMeetRoomProps) {
  return <DailyVideoRoom {...props} />;
}
