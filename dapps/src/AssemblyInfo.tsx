import { useSmartObject } from "@evefrontier/dapp-kit";

export function AssemblyInfo() {
  const { assembly, character, loading, error, refetch } = useSmartObject();

  if (loading) return <div>Loading assembly...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!assembly) return <div>No assembly found</div>;

  return (
    <div>
      <h2>{assembly.name}</h2>
      <p>Type: {assembly.type}</p>
      <p>State: {assembly.state}</p>
      <p>ID: {assembly.id}</p>
      {character && <p>Owner: {character.name}</p>}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
