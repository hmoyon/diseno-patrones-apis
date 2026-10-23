import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import DataLoader from 'dataloader';

// 1. SIMULACIÓN DE LA BASE DE DATOS (MOCK DB)
const CLIENTES_DB = [
    { id: "c-1", nombre: "Corporación Alfa", sector: "Finanzas" },
    { id: "c-2", nombre: "Logística Beta", sector: "Transporte" },
    { id: "c-3", nombre: "Industrias Gamma", sector: "Manufactura" }
];

const FACTURAS_DB = [
    { id: "f-1", clienteId: "c-1", monto: 1500.00 },
    { id: "f-2", clienteId: "c-1", monto: 2300.50 },
    { id: "f-3", clienteId: "c-2", monto: 450.00 },
    { id: "f-4", clienteId: "c-3", monto: 8900.00 }
];

// Helper para simular latencia de red (200ms)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const db = {
    async fetchAllClientes() {
        console.log("\x1b[36m%s\x1b[0m", "[DB READ] SELECT * FROM clientes;");
        await delay(200); 
        return CLIENTES_DB;
    },
    // Método que causará el problema N+1
   async fetchFacturasByClienteIdsBatch(clienteIds) {
    const lista = clienteIds.map(id => `'${id}'`).join(', ');
    console.log("\x1b[32m%s\x1b[0m", `[DB BATCH READ] SELECT * FROM facturas WHERE cliente_id IN (${lista});`);
    await delay(200);
    const filas = FACTURAS_DB.filter(f => clienteIds.includes(f.clienteId));
    const facturasPorCliente = new Map(clienteIds.map(id => [id, []]));
    for (const factura of filas) {
        facturasPorCliente.get(factura.clienteId).push(factura);
    }
    return clienteIds.map(id => facturasPorCliente.get(id));
}
};


const createLoaders = () => ({
    facturasByClienteId: new DataLoader(
        (clienteIds) => db.fetchFacturasByClienteIdsBatch(clienteIds)
    )
});



// 2. DEFINICIÓN DEL ESQUEMA (SDL)
const typeDefs = `#graphql
  type Cliente {
    id: ID!
    nombre: String!
    sector: String!
    facturas: [Factura!]!
  }

  type Factura {
    id: ID!
    monto: Float!
  }

  type Query {
    clientes: [Cliente!]!
  }
`;

// 3. RESOLUTORES (IMPLEMENTACIÓN INGENUA)
// Los estudiantes deberán modificar este archivo para inyectar el DataLoader desde el contexto
const resolvers = {
    Query: {
        clientes: async () => await db.fetchAllClientes(),
    },
    Cliente: {
        facturas: (parent, _args, context) =>
            context.loaders.facturasByClienteId.load(parent.id)
    }
};

// 4. INICIALIZACIÓN DEL SERVIDOR
const server = new ApolloServer({ typeDefs, resolvers });
const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({
        loaders: createLoaders()
    })
});
console.log(`🚀 Servidor Académico listo en: ${url}`);