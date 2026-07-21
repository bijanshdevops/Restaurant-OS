import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Restaurants OS Platform API',
      version: '1.0.0',
      description: 'Centralized API Documentation for the Multi-Tenant Restaurants OS Platform',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Edge-verified JWT authorization. Injects tenantId securely.'
        },
        tenantHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-tenant-id',
          description: 'Tenant identification strictly for public endpoints (e.g. /api/auth/register).'
        }
      }
    },
    // Default security requirement (forces lock icons on all endpoints by default)
    security: [{ bearerAuth: [] }]
  },
  // Dynamically scan all Clean Architecture Controllers for JSDoc API annotations
  apis: ['./src/modules/*/presentation/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
