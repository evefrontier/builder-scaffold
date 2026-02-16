import {
  // Core fetch functions
  executeGraphQLQuery, // Raw GraphQL execution
  getObjectByAddress, // Object with BCS data
  getObjectWithJson, // Object with JSON contents
  getObjectWithDynamicFields, // Object + dynamic fields

  // Assembly + Owner (most useful for EVE)
  getAssemblyWithOwner, // Assembly + character info in one call
  getObjectAndCharacterOwner, // Lower-level version

  // Ownership queries
  getOwnedObjectsByType, // Objects of type owned by address
  getOwnedObjectsByPackage, // Objects from package owned by address

  // Type-based queries
  getObjectsByType, // All objects of a type (paginated)
  getSingletonObjectByType, // First object of a type

  // Transformation functions
  transformToAssembly,
} from "@evefrontier/dapp-kit";

async function fetchAssemblyInfo(assemblyId: string) {
  // 1. Fetch raw data from GraphQL
  const { moveObject, character } = await getAssemblyWithOwner(assemblyId);

  if (!moveObject) {
    console.error("Assembly not found");
    return null;
  }

  // 2. Access raw JSON data directly
  const rawJson = moveObject.contents.json;
  console.log("Raw assembly data:", rawJson);
  console.log("Character owner:", character);

  // 3. Or transform to typed Assembly object
  const assembly = await transformToAssembly(assemblyId, moveObject, {
    character,
  });
  console.log("Transformed assembly:", assembly);

  return { assembly, character };
}

async function fetchObjectData(objectId: string) {
  const result = await getObjectWithJson(objectId);

  const json = result.data?.object?.asMoveObject?.contents?.json;
  const type = result.data?.object?.asMoveObject?.contents?.type?.repr;

  console.log("Object type:", type);
  console.log("Object data:", json);

  return json;
}

async function fetchUserAssemblies(
  walletAddress: string,
  assemblyType: string,
) {
  const result = await getOwnedObjectsByType(walletAddress, assemblyType);

  const objectAddresses = result.data?.address?.objects?.nodes.map(
    (node) => node.address,
  );

  console.log("Owned object addresses:", objectAddresses);
  return objectAddresses;
}

export { fetchAssemblyInfo, fetchObjectData, fetchUserAssemblies };
