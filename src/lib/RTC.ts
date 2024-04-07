import { socket } from "./Socket";

export let localStream: MediaStream;
export let remoteStream: MediaStream;

let candidates: RTCIceCandidate[];

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export let pc: RTCPeerConnection = new RTCPeerConnection(servers);

export async function generateCall(
  name: string,
  location: { lat: number | undefined; lon: number | undefined }
) {
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);
  candidates = await new Promise<RTCIceCandidate[]>((resolve) => {
    const candidates: RTCIceCandidate[] = [];
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        candidates.push(event.candidate);
      } else {
        resolve(candidates);
      }
    };
  });

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  return {
    sdpData: offer,
    candidates: JSON.stringify(candidates),
    name,
    location,
  };
}

export async function connectToIncomingCall(args: {
  candidates: RTCIceCandidate[];
  answer: RTCSessionDescriptionInit;
}) {
  await pc.setRemoteDescription(new RTCSessionDescription(args.answer));

  args.candidates?.forEach((candidate: RTCIceCandidate) => {
    try {
      pc.addIceCandidate(candidate);
    } catch (error) {
      console.log(error);
    }
  });
}

export async function setupCall() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  remoteStream = new MediaStream();

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  return { localStream, remoteStream };
}

export async function answerCall(
  offer: string,
  offerCandidates: RTCIceCandidate[],
  id: string
) {
  await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  if (!candidates) {
    candidates = await new Promise<RTCIceCandidate[]>((resolve) => {
      const candidates: RTCIceCandidate[] = [];
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          candidates.push(event.candidate);
        } else {
          resolve(candidates);
        }
      };
    });
  }

  offerCandidates?.forEach((candidate: RTCIceCandidate) => {
    try {
      pc.addIceCandidate(candidate);
    } catch (error) {
      console.log(error);
    }
  });

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  socket.emit("newConnection", { answer, candidates, id });
}

export async function endCall(accessToken: string) {
  pc.close();
  pc.onicecandidate = null;

  pc = new RTCPeerConnection(servers);

  await setupCall();

  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  candidates = await new Promise<RTCIceCandidate[]>((resolve) => {
    const candidates: RTCIceCandidate[] = [];
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        candidates.push(event.candidate);
      } else {
        resolve(candidates);
      }
    };
  });

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await fetch("http://localhost/api/v1/calls/sdp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + accessToken,
    },
    body: JSON.stringify({ sdp: offer, candidates }),
  });

  return "OK";
}
