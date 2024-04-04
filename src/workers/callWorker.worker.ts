interface CallData {
  sdpData: string;
  candidates: string;
  name: string;
}

export default () => {
  self.addEventListener("message", (event) => {
    const data = event.data;
    const result = performIntensiveTask(data);
    self.postMessage(result);
  });

  function performIntensiveTask(data: CallData) {
    (async () => {
      const res = await fetch("http://localhost/api/v1/calls/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(data),
      });

      self.postMessage({
        success: res.ok,
        message: (await res.json()).message,
      });
    })();
  }
};
