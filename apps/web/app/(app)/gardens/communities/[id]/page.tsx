export default function Community({
  params: { id },
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h2>hello {id}</h2>
    </div>
  );
}
