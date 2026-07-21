import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Restaurant-OS API",
    version: "1.0.0",
    description: "Multi-tenant Restaurant Operating System API"
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  },
  security: [
    { BearerAuth: [] }
  ],
  paths: {
    "/api/orders": {
      post: {
        summary: "Place a new order",
        description: "Creates an order, reserves inventory, and queues Outbox events.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  customerId: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        menuItemId: { type: "string" },
                        quantity: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Order successfully placed" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "429": { description: "Too Many Requests (Rate Limited)" }
        }
      }
    },
    "/api/analytics/stats": {
      get: {
        summary: "Get Tenant Stats",
        description: "Retrieves core analytics segmented by Customer CRM profiles.",
        responses: {
          "200": { description: "Returns tenant statistics" },
          "401": { description: "Unauthorized" },
          "429": { description: "Too Many Requests (Rate Limited)" }
        }
      }
    }
  }
};

const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Restaurant-OS API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(openApiSpec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
      });
    };
  </script>
</body>
</html>
`;

export async function GET() {
  return new NextResponse(swaggerHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}
