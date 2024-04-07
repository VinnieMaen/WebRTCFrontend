import { io, Socket } from "socket.io-client";
export let socket: Socket;

export function initSocket(id: string) {
  socket = io("ws://localhost", {
    query: {
      id: id,
    },
  });
}
