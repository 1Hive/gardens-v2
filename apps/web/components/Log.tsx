export const Log = ({ label, payload }: { payload: object; label: string }) => {
  // eslint-disable-next-line no-console
  if (label) console.log(label, payload);
  // eslint-disable-next-line no-console
  else console.log(payload);
  return <></>;
};
