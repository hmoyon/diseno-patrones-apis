import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

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
    async fetchFacturasByClienteId(clienteId) {
        console.log("\x1b[31m%s\x1b[0m", `[DB READ] SELECT * FROM facturas WHERE cliente_id = '${clienteId}';`);
        await delay(200);
        return FACTURAS_DB.filter(f => f.clienteId === clienteId);
    }
};

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
        facturas: async (parent) => {
            // El 'parent' es el cliente actual. GraphQL llama a esta función por CADA cliente devuelto.
            return await db.fetchFacturasByClienteId(parent.id);
        }
    }
};

// 4. INICIALIZACIÓN DEL SERVIDOR
const server = new ApolloServer({ typeDefs, resolvers });
const { url } = await startStandaloneServer(server, { listen: { port: 4000 } });
console.log(`🚀 Servidor listo en Académico listo en: ${url}`);
