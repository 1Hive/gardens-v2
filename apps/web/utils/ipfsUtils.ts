type MetadataV1 = {
  title: string;
  description: string;
};

export const ipfsJsonUpload = async (form: object) => {
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
      return await Promise.resolve(json.IpfsHash);
    } else {
      return await Promise.reject(json);
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
      return await Promise.resolve(json.IpfsHash);
    } else {
      return await Promise.reject(json);
    }
  } catch (err) {
    console.error(err);
  }
};

export const getIpfsMetadata = async (ipfsHash: string) => {
  let title = "No title found";
  let description = "No description found";
  try {
    const rawProposalMetadata = await fetch(
      `https://ipfs.io/ipfs/${ipfsHash}`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
      },
    );

    const proposalMetadata: MetadataV1 = await rawProposalMetadata.json();
    if (title) title = proposalMetadata?.title;
    if (description) description = proposalMetadata?.description;
  } catch (error) {
    console.error(error);
  }
  return { title: title, description: description };
};
