const express = require('express');
const router = express.Router();
const db = require('../db');
const { validateCampaignId } = require('../middleware/validation');

// Middleware para logs
router.use((req, res, next) => {
  console.log(`--- ${req.method} ${req.originalUrl} ---`);

  if (req.headers && typeof req.headers === 'object' && Object.keys(req.headers).length > 0) {
    console.log('Request Headers Keys:', Object.keys(req.headers));
  } else if (req.headers) {
    console.log('Request Headers: (empty or not an object with keys)');
  }

  if (req.params && typeof req.params === 'object' && Object.keys(req.params).length > 0) {
    console.log('Request Params:', JSON.stringify(req.params, null, 2));
  } else if (req.params) {
    console.log('Request Params: (empty or not an object with keys)');
  }

  if (req.query && typeof req.query === 'object' && Object.keys(req.query).length > 0) {
    console.log('Request Query:', JSON.stringify(req.query, null, 2));
  } else if (req.query) {
    console.log('Request Query: (empty or not an object with keys)');
  }

  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
  } else if (req.body) {
    console.log('Request Body: (exists but is not an object with keys or is empty object)', req.body);
  } else {
    console.log('Request Body: (undefined or null)');
  }
  next();
});

// Rota para buscar todas as campanhas
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, name, status, start_date, end_date, budget::text, total_impressions, total_clicks, ctr::text FROM campaigns_view');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro em GET /api/campaigns:', err);
    next(err);
  }
});

// Rota para criar uma nova campanha
router.post('/', async (req, res, next) => {
  const { name, start_date, end_date, budget, status } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'O nome da campanha é obrigatório.' });
  }
  if (name && typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: 'O nome da campanha deve ser um texto não vazio.' });
  }
  if (budget !== undefined && budget !== null && (typeof budget !== 'number' || budget < 0)) {
    return res.status(400).json({ message: 'O orçamento deve ser um número não negativo.' });
  }
  if (start_date && isNaN(new Date(start_date).getTime())) {
    return res.status(400).json({ message: 'Formato inválido para data de início.' });
  }
  if (end_date && isNaN(new Date(end_date).getTime())) {
    return res.status(400).json({ message: 'Formato inválido para data de término.' });
  }
  if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
    return res.status(400).json({ message: 'A data de início não pode ser posterior à data de término.' });
  }
  const validStatuses = ['draft', 'active', 'paused', 'completed', 'archived'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: `Status inválido. Deve ser um de: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await db.query(
      'INSERT INTO campaigns (name, start_date, end_date, budget, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, start_date ? new Date(start_date) : null, end_date ? new Date(end_date) : null, budget, status || 'draft']
    );

    if (result.rows.length > 0) {
      const campaign = result.rows[0];
      const viewResult = await db.query('SELECT id, name, status, start_date, end_date, budget::text, total_impressions, total_clicks, ctr::text FROM campaigns_view WHERE id = $1', [campaign.id]);
      if (viewResult.rows.length > 0) {
        const responseCampaign = viewResult.rows[0];
        if (responseCampaign.start_date) {
            responseCampaign.start_date = new Date(responseCampaign.start_date).toISOString().split('T')[0];
        }
        if (responseCampaign.end_date) {
            responseCampaign.end_date = new Date(responseCampaign.end_date).toISOString().split('T')[0];
        }
        res.status(201).json(responseCampaign);
      } else {
        res.status(201).json({
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            start_date: campaign.start_date ? new Date(campaign.start_date).toISOString().split('T')[0] : null,
            end_date: campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : null,
            budget: campaign.budget !== null ? Number(campaign.budget).toFixed(2) : null,
            total_impressions: 0,
            total_clicks: 0,
            ctr: "0.00"
        });
      }
    } else {
      console.error('Resultado inesperado do banco de dados após a inserção:', result);
      res.status(500).json({ message: 'Falha ao criar campanha, resposta inesperada do banco de dados.' });
    }
  } catch (err) {
    console.error('Erro em POST /api/campaigns:', err);
    next(err);
  }
});

// Rota para buscar uma campanha específica
router.get('/:id', validateCampaignId, async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT id, name, status, start_date, end_date, budget::text, total_impressions, total_clicks, ctr::text FROM campaigns_view WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campanha não encontrada.' });
    }
    const campaign = result.rows[0];
    if (campaign.start_date) {
        campaign.start_date = new Date(campaign.start_date).toISOString().split('T')[0];
    }
    if (campaign.end_date) {
        campaign.end_date = new Date(campaign.end_date).toISOString().split('T')[0];
    }
    res.json(campaign);
  } catch (err) {
    console.error(`Erro em GET /api/campaigns/${id}:`, err);
    next(err);
  }
});

// Rota para atualizar uma campanha
router.put('/:id', validateCampaignId, async (req, res, next) => {
  const { id } = req.params;
  const { name, start_date, end_date, budget, status } = req.body;

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: 'Nenhum campo fornecido para atualização.' });
  }

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return res.status(400).json({ message: 'O nome da campanha não pode estar vazio.' });
  }
  if (budget !== undefined && budget !== null && (typeof budget !== 'number' || budget < 0)) {
    return res.status(400).json({ message: 'O orçamento deve ser um número não negativo.' });
  }
  if (start_date !== undefined && start_date !== null && isNaN(new Date(start_date).getTime())) {
    return res.status(400).json({ message: 'Formato inválido para data de início.' });
  }
  if (end_date !== undefined && end_date !== null && isNaN(new Date(end_date).getTime())) {
    return res.status(400).json({ message: 'Formato inválido para data de término.' });
  }
  
  const validStatuses = ['draft', 'active', 'paused', 'completed', 'archived'];
  if (status !== undefined && !validStatuses.includes(status)) {
    return res.status(400).json({ message: `Status inválido. Deve ser um de: ${validStatuses.join(', ')}` });
  }

  try {
    const currentCampaignResult = await db.query('SELECT start_date, end_date FROM campaigns WHERE id = $1', [id]);
    if (currentCampaignResult.rows.length === 0) {
        return res.status(404).json({ message: 'Campanha não encontrada para atualizar.' });
    }
    const currentCampaign = currentCampaignResult.rows[0];

    const finalStartDate = start_date !== undefined ? (start_date ? new Date(start_date) : null) : currentCampaign.start_date;
    const finalEndDate = end_date !== undefined ? (end_date ? new Date(end_date) : null) : currentCampaign.end_date;

    if (finalStartDate && finalEndDate && finalStartDate > finalEndDate) {
      return res.status(400).json({ message: 'A data de início não pode ser posterior à data de término.' });
    }
    
    const fields = [];
    const values = [];
    let queryIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${queryIndex++}`);
      values.push(name);
    }
    if (start_date !== undefined) {
      fields.push(`start_date = $${queryIndex++}`);
      values.push(start_date ? new Date(start_date) : null);
    }
    if (end_date !== undefined) {
      fields.push(`end_date = $${queryIndex++}`);
      values.push(end_date ? new Date(end_date) : null);
    }
    if (budget !== undefined) {
      fields.push(`budget = $${queryIndex++}`);
      values.push(budget);
    }
    if (status !== undefined) {
      fields.push(`status = $${queryIndex++}`);
      values.push(status);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo válido fornecido para atualização.' });
    }

    values.push(id); 

    const updateQuery = `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING *`;
    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campanha não encontrada para atualizar.' });
    }
    
    const viewResult = await db.query('SELECT id, name, status, start_date, end_date, budget::text, total_impressions, total_clicks, ctr::text FROM campaigns_view WHERE id = $1', [id]);
     if (viewResult.rows.length > 0) {
        const updatedCampaign = viewResult.rows[0];
        if (updatedCampaign.start_date) {
            updatedCampaign.start_date = new Date(updatedCampaign.start_date).toISOString().split('T')[0];
        }
        if (updatedCampaign.end_date) {
            updatedCampaign.end_date = new Date(updatedCampaign.end_date).toISOString().split('T')[0];
        }
        res.json(updatedCampaign);
    } else {
        res.status(404).json({ message: 'Campanha atualizada não encontrada na visualização.' }); 
    }

  } catch (err) {
    console.error(`Erro em PUT /api/campaigns/${id}:`, err);
    next(err);
  }
});

// Rota para deletar uma campanha
router.delete('/:id', validateCampaignId, async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM campaigns WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Campanha não encontrada para excluir.' });
    }
    res.status(204).send(); 
  } catch (err) {
    console.error(`Erro em DELETE /api/campaigns/${id}:`, err);
    next(err);
  }
});

// Rota para buscar todos os dados de performance de uma campanha específica
router.get('/:id/performance', validateCampaignId, async (req, res, next) => {
  const campaignId = parseInt(req.params.id);
  try {
    const result = await db.query(
      'SELECT id, report_date, impressions, clicks FROM daily_performance WHERE campaign_id = $1 ORDER BY report_date ASC',
      [campaignId]
    );
    const performanceData = result.rows.map(row => ({
      ...row,
      report_date: new Date(row.report_date).toISOString().split('T')[0]
    }));
    res.json(performanceData);
  } catch (err) {
    console.error(`Erro em GET /api/campaigns/${campaignId}/performance:`, err);
    next(err);
  }
});

// Rota para adicionar dados de performance a uma campanha
router.post('/:id/performance', validateCampaignId, async (req, res, next) => {
  const campaignId = parseInt(req.params.id);
  const { report_date, impressions, clicks } = req.body;

  if (!report_date || !/^\d{4}-\d{2}-\d{2}$/.test(report_date) || isNaN(new Date(report_date).getTime())) {
    return res.status(400).json({ message: 'Uma data de relatório válida (AAAA-MM-DD) é obrigatória.' });
  }
  if (impressions === undefined || !Number.isInteger(impressions) || impressions < 0) {
    return res.status(400).json({ message: 'Impressões devem ser um número inteiro não negativo.' });
  }
  if (clicks === undefined || !Number.isInteger(clicks) || clicks < 0) {
    return res.status(400).json({ message: 'Cliques devem ser um número inteiro não negativo.' });
  }
  if (clicks > impressions) {
    return res.status(400).json({ message: 'Cliques não podem ser maiores que impressões.' });
  }

  try {
    const campaignCheck = await db.query('SELECT id FROM campaigns WHERE id = $1', [campaignId]);
    if (campaignCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Campanha não encontrada para adicionar dados de performance.' });
    }

    const existingPerfCheck = await db.query(
      'SELECT id FROM daily_performance WHERE campaign_id = $1 AND report_date = $2',
      [campaignId, report_date] 
    );

    if (existingPerfCheck.rows.length > 0) {
      return res.status(409).json({ message: `Os dados de performance para a campanha ${campaignId} na data ${report_date} já existem.` });
    }

    const result = await db.query(
      'INSERT INTO daily_performance (campaign_id, report_date, impressions, clicks) VALUES ($1, $2, $3, $4) RETURNING *',
      [campaignId, new Date(report_date), impressions, clicks] 
    );
    
    const performanceData = result.rows[0];
    if (performanceData && performanceData.report_date) {
        performanceData.report_date = new Date(performanceData.report_date).toISOString().split('T')[0];
    }
    res.status(201).json(performanceData);

  } catch (err) {
    console.error(`Erro em POST /api/campaigns/${campaignId}/performance:`, err);
    if (err.code === '23505') { 
        return res.status(409).json({ message: `Os dados de performance para esta data e campanha já existem (restrição do banco de dados). Detalhe: ${err.detail || ''}`.trim() });
    }
    next(err);
  }
});

module.exports = router;