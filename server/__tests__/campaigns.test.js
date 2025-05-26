const request = require('supertest');
const app = require('../index'); // Certifique-se que este é o caminho correto para seu app Express
// const db = require('../db'); // db é mockado, então o require direto pode não ser necessário aqui, a menos que usado para tipos/constantes não mockadas.

// Mock do módulo db. Garanta que este mock cubra o que suas rotas esperam.
jest.mock('../db', () => ({
  query: jest.fn(),
}));

// Mock do middleware de validação.
// Certifique-se que o caminho para o seu middleware de validação real está correto.
jest.mock('../middleware/validation', () => ({
  validateCampaignId: jest.fn((req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      // Em um mock, você pode simular o comportamento do middleware,
      // incluindo o envio de uma resposta de erro se a validação falhar.
      // No entanto, para testes de rota, geralmente você quer que o middleware chame next()
      // ou simule o erro para que a rota principal não seja atingida,
      // e o teste verifique o status code do middleware.
      // Se o objetivo é testar a lógica *após* uma validação bem-sucedida, chame next().
      // Se o objetivo é testar a própria validação do middleware (em testes de unidade para o middleware),
      // então você verificaria se ele envia o status/json correto.
      // Para testes de integração de rotas que USAM este middleware,
      // se você quer testar o caso de ID inválido, o mock deve enviar a resposta.
      // Se quer testar o caso de ID válido, ele deve chamar next().
      // O mock original estava correto para simular o bloqueio por ID inválido.
      return res.status(400).json({ message: 'Invalid campaign ID format. ID must be a positive integer.' });
    }
    next();
  }),
  // Adicione mocks para outros middlewares de validação se existirem e forem usados.
  // Exemplo:
  // validateCampaignData: jest.fn((req, res, next) => next()),
  // validatePerformanceData: jest.fn((req, res, next) => next()),
}));

/*
describe('Campaign API Endpoints', () => {
  const campaignId = 1; // Common ID for testing specific campaign routes
  const mockDate = new Date().toISOString();

  beforeEach(() => {
    // Reset the mock before each test to clear call counts and previous mockResolvedValue/mockRejectedValue
    db.query.mockReset();
    // Se você mockou middlewares de validação com jest.fn(), pode querer resetá-los também:
    // require('../middleware/validation').validateCampaignId.mockClear();
  });

  describe('GET /api/campaigns', () => {
    it('should return an empty array when no campaigns exist', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const response = await request(app).get('/api/campaigns');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return a list of campaigns when campaigns exist', async () => {
      const mockCampaigns = [
        { id: 1, name: 'Campaign 1', status: 'active', start_date: mockDate, end_date: mockDate, budget: "100.00", total_impressions: 10, total_clicks: 1, ctr: "10.00" },
        { id: 2, name: 'Campaign 2', status: 'draft', start_date: null, end_date: null, budget: "200.50", total_impressions: 0, total_clicks: 0, ctr: "0.00" },
      ];
      db.query.mockResolvedValue({ rows: mockCampaigns });
      const response = await request(app).get('/api/campaigns');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockCampaigns);
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValue(new Error('DB error'));
      const response = await request(app).get('/api/campaigns');
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/campaigns', () => {
    const newCampaignData = {
      name: 'New Test Campaign',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      budget: 500.75,
      status: 'active',
    };
    // Simula o retorno do INSERT ... RETURNING *
    const dbInsertedRow = { 
      id: campaignId, // ou um novo ID como 3
      name: newCampaignData.name,
      start_date: new Date(newCampaignData.start_date), // O DB retornaria um objeto Date
      end_date: new Date(newCampaignData.end_date),   // O DB retornaria um objeto Date
      budget: newCampaignData.budget, // O DB retornaria um número
      status: newCampaignData.status,
     };

     // Simula como a VIEW retornaria o dado após o insert (se a rota buscar da view)
     const viewResponseRowAfterInsert = {
        id: dbInsertedRow.id,
        name: dbInsertedRow.name,
        status: dbInsertedRow.status,
        start_date: dbInsertedRow.start_date.toISOString(),
        end_date: dbInsertedRow.end_date.toISOString(),
        budget: Number(dbInsertedRow.budget).toFixed(2), // Formato string com 2 casas decimais
        total_impressions: 0, // Valor inicial da view
        total_clicks: 0,      // Valor inicial da view
        ctr: "0.00"           // Valor inicial da view
      };


    it('should create a new campaign and return it with status 201', async () => {
      // Se sua rota POST faz um INSERT e depois um SELECT da VIEW para retornar o objeto:
      db.query.mockResolvedValueOnce({ rows: [dbInsertedRow] }); // Para o INSERT ... RETURNING *
      db.query.mockResolvedValueOnce({ rows: [viewResponseRowAfterInsert] }); // Para o SELECT da VIEW

      const response = await request(app)
        .post('/api/campaigns')
        .send(newCampaignData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual(viewResponseRowAfterInsert);
      // Se a rota faz 2 queries (INSERT e depois SELECT da VIEW)
      expect(db.query).toHaveBeenCalledTimes(2); 
      expect(db.query).toHaveBeenNthCalledWith(1,
        'INSERT INTO campaigns (name, start_date, end_date, budget, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [
          newCampaignData.name,
          new Date(newCampaignData.start_date), // Envia como objeto Date
          new Date(newCampaignData.end_date),   // Envia como objeto Date
          newCampaignData.budget,
          newCampaignData.status,
        ]
      );
      // Verifique a segunda chamada se aplicável
      // expect(db.query).toHaveBeenNthCalledWith(2, 'SELECT ... FROM campaigns_view WHERE id = $1', [dbInsertedRow.id]);
    });

    it('should return 400 if name is missing', async () => {
      const { name, ...incompleteData } = newCampaignData;
      const response = await request(app)
        .post('/api/campaigns')
        .send(incompleteData);
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message', 'Campaign name is required.');
    });

    it('should return 400 if budget is invalid (negative)', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .send({ ...newCampaignData, budget: -100 });
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message', 'Budget must be a non-negative number.');
    });
    
    it('should handle database errors gracefully on POST', async () => {
      db.query.mockRejectedValue(new Error('DB error on POST'));
      const response = await request(app)
        .post('/api/campaigns')
        .send(newCampaignData);
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/campaigns/:id/performance', () => {
    const performanceData = {
      report_date: '2024-01-15', // String no payload
      impressions: 1000,
      clicks: 50,
    };
    // Simula o retorno do INSERT na tabela performance_data
    const dbInsertedPerformanceRow = {
      id: 101, // Novo ID do registro de performance
      campaign_id: campaignId,
      report_date: new Date(performanceData.report_date), // Objeto Date do DB
      impressions: performanceData.impressions,
      clicks: performanceData.clicks,
    };
    // Simula a resposta da API (com data como ISOString)
    const expectedApiResponse = {
      ...dbInsertedPerformanceRow,
      report_date: dbInsertedPerformanceRow.report_date.toISOString(),
    };


    it('should add performance data and return 201', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: campaignId }] }); // 1. Check campaign exists
      db.query.mockResolvedValueOnce({ rows: [] }); // 2. Check existing performance data (none)
      db.query.mockResolvedValueOnce({ rows: [dbInsertedPerformanceRow] }); // 3. Insert performance data

      const response = await request(app)
        .post(`/api/campaigns/${campaignId}/performance`)
        .send(performanceData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual(expectedApiResponse);
      expect(db.query).toHaveBeenCalledTimes(3);
    });

    it('should return 404 if campaign not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // Campaign check fails
      const response = await request(app)
        .post(`/api/campaigns/999/performance`) // Non-existent ID
        .send(performanceData);
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('message', 'Campaign not found to add performance data.');
    });

    it('should return 409 if performance data already exists', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: campaignId }] }); // Campaign check
      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Existing performance check finds data

      const response = await request(app)
        .post(`/api/campaigns/${campaignId}/performance`)
        .send(performanceData);
      expect(response.statusCode).toBe(409);
      // A mensagem exata pode depender da sua implementação de tratamento de erro para código '23505'
      expect(response.body).toHaveProperty('message'); 
    });
    
    it('should return 400 if report_date is missing', async () => {
        const { report_date, ...invalidData } = performanceData;
        const response = await request(app)
            .post(`/api/campaigns/${campaignId}/performance`)
            .send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message', 'Report date is required.');
    });

    it('should handle DB error on performance insert', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: campaignId }] }); 
      db.query.mockResolvedValueOnce({ rows: [] }); 
      db.query.mockRejectedValueOnce(new Error('DB error insert perf')); 

      const response = await request(app)
        .post(`/api/campaigns/${campaignId}/performance`)
        .send(performanceData);
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/campaigns/:id', () => {
    const mockCampaignView = { id: campaignId, name: 'Test Campaign', status: 'active', start_date: mockDate, end_date: mockDate, budget: "100.00", total_impressions: 10, total_clicks: 1, ctr: "10.00" };

    it('should return a single campaign if found', async () => {
      db.query.mockResolvedValueOnce({ rows: [mockCampaignView] });
      const response = await request(app).get(`/api/campaigns/${campaignId}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockCampaignView);
      expect(db.query).toHaveBeenCalledWith('SELECT id, name, status, start_date, end_date, budget::text, total_impressions, total_clicks, ctr::text FROM campaigns_view WHERE id = $1', [campaignId]);
    });

    it('should return 404 if campaign not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      const response = await request(app).get(`/api/campaigns/999`);
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('message', 'Campaign not found.');
    });

    it('should handle DB errors on GET /:id', async () => {
      db.query.mockRejectedValueOnce(new Error('DB error on GET /:id'));
      const response = await request(app).get(`/api/campaigns/${campaignId}`);
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 if id is not a valid number (mocked middleware test)', async () => {
      // Este teste depende do mock do middleware de validação configurado no topo do arquivo.
      // O mock de `validateCampaignId` deve enviar a resposta 400.
      const response = await request(app).get('/api/campaigns/invalid-id');
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid campaign ID format. ID must be a positive integer.');
      expect(db.query).not.toHaveBeenCalled(); // A query ao DB não deve ser chamada
    });
  });

  describe('PUT /api/campaigns/:id', () => {
    const updatePayload = { name: 'Updated Name', status: 'paused', budget: 600.25 };
    // Simula o retorno do UPDATE ... RETURNING *
    const dbUpdatedRow = { 
        id: campaignId, 
        name: updatePayload.name,
        status: updatePayload.status,
        // Supondo que start_date e end_date não são alterados ou vêm do DB
        start_date: new Date('2025-01-01T00:00:00.000Z'), 
        end_date: new Date('2025-12-31T00:00:00.000Z'),
        budget: updatePayload.budget, // Número
    };
    // Simula a resposta da VIEW após o update
    const viewResponseAfterUpdate = { 
        id: campaignId, 
        name: updatePayload.name, 
        status: updatePayload.status, 
        start_date: dbUpdatedRow.start_date.toISOString(), 
        end_date: dbUpdatedRow.end_date.toISOString(), 
        budget: Number(updatePayload.budget).toFixed(2), // String formatada
        total_impressions: 20, // Exemplo de valor da view
        total_clicks: 5,       // Exemplo de valor da view
        ctr: "25.00"           // Exemplo de valor da view
    };


    it('should update an existing campaign and return it', async () => {
      // Se sua rota PUT faz um UPDATE e depois um SELECT da VIEW:
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [dbUpdatedRow] }); // Para o UPDATE ... RETURNING *
      db.query.mockResolvedValueOnce({ rows: [viewResponseAfterUpdate] });   // Para o SELECT da VIEW

      const response = await request(app).put(`/api/campaigns/${campaignId}`).send(updatePayload);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(viewResponseAfterUpdate);
      expect(db.query).toHaveBeenCalledTimes(2); 
      // Adicione expect(db.query).toHaveBeenNthCalledWith(...) para verificar as queries exatas se necessário
    });

    it('should return 400 if no fields provided for update', async () => {
      const response = await request(app).put(`/api/campaigns/${campaignId}`).send({});
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message', 'No fields provided for update.');
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 404 if campaign to update not found', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // UPDATE query encontra 0 linhas
      // Se sua rota tenta buscar da view mesmo se rowCount for 0, adicione outro mock:
      // db.query.mockResolvedValueOnce({ rows: [] });
      const response = await request(app).put(`/api/campaigns/999`).send(updatePayload);
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('message', 'Campaign not found to update.');
    });
    
    it('should return 400 if name is empty string for update', async () => {
        const response = await request(app).put(`/api/campaigns/${campaignId}`).send({ name: "" });
        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message', 'Campaign name cannot be empty.');
    });

    it('should handle DB errors on PUT /:id', async () => {
      db.query.mockRejectedValueOnce(new Error('DB error on PUT'));
      const response = await request(app).put(`/api/campaigns/${campaignId}`).send(updatePayload);
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
    
    it('should return 400 if id is invalid for update (mocked middleware test)', async () => {
      const response = await request(app).put('/api/campaigns/invalid-id').send(updatePayload);
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid campaign ID format. ID must be a positive integer.');
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/campaigns/:id', () => {
    it('should delete a campaign and return 204 No Content', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 1 }); // Mock para DELETE performance_data (pode ser 0 ou mais)
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{id: campaignId}] }); // Mock para DELETE campaign (deve retornar a linha deletada ou rowCount > 0)

      const response = await request(app).delete(`/api/campaigns/${campaignId}`);
      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(db.query).toHaveBeenNthCalledWith(1, 'DELETE FROM performance_data WHERE campaign_id = $1', [campaignId]);
      expect(db.query).toHaveBeenNthCalledWith(2, 'DELETE FROM campaigns WHERE id = $1 RETURNING id', [campaignId]);
    });

    it('should return 404 if campaign to delete not found', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0 }); 
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); 
      const response = await request(app).delete(`/api/campaigns/999`);
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('message', 'Campaign not found to delete.');
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should handle DB error when deleting performance_data on DELETE /:id', async () => {
      db.query.mockRejectedValueOnce(new Error('DB error deleting performance_data'));
      const response = await request(app).delete(`/api/campaigns/${campaignId}`);
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('message');
      expect(db.query).toHaveBeenCalledTimes(1); 
    });
    
    it('should handle DB error when deleting campaign on DELETE /:id', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 1 }); 
      db.query.mockRejectedValueOnce(new Error('DB error deleting campaign')); 
      const response = await request(app).delete(`/api/campaigns/${campaignId}`);
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('message');
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should return 400 if id is invalid for delete (mocked middleware test)', async () => {
      const response = await request(app).delete('/api/campaigns/invalid-id');
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid campaign ID format. ID must be a positive integer.');
      expect(db.query).not.toHaveBeenCalled();
    });
  });
});
*/