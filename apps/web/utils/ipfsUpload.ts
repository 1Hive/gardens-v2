export const ipfsJsonUpload = async (form: {}) => {
  try {
    const res = await fetch("/api/ipfs", {
      method: "POST",
      body: JSON.stringify(form),
      headers: {
        "content-type": "application/json",
      },
    });
    const json = await res.json();
    if (json?.IpfsHash) {
      return Promise.resolve(json.IpfsHash);
    } else {
      return Promise.reject(json);
    }
  } catch (err) {
    console.error(err);
  }
};

export const ipfsFileUpload = async (selectedFile: File) => {
  const data = new FormData();
  data.set("file", selectedFile);
  try {
    const res = await fetch("/api/ipfs", {
      method: "POST",
      body: data,
    });
    const json = await res.json();
    if (json?.IpfsHash) {
      return Promise.resolve(json.IpfsHash);
    } else {
      return Promise.reject(json);
    }
  } catch (err) {
    console.error(err);
  }
};
