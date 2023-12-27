export default function Gardens({
  params: { id },
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1>Pool{id} </h1>
    </div>
  );
}
