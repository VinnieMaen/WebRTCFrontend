let localStream: MediaStream;
let remoteStream: MediaStream;

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export const pc = new RTCPeerConnection(servers);

export async function generateCall(name: string) {
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);
  const candidates = await new Promise<RTCIceCandidate[]>((resolve) => {
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
  };
}

export async function setupCall() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  remoteStream = new MediaStream();

  localStream.getTracks().forEach((track) => {
    console.log(track);
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  return { localStream, remoteStream };
}
