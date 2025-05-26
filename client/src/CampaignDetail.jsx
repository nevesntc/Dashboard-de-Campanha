import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
);

function PerformanceDataForm({ campaignId, onDataAdded }) {
  const [reportDate, setReportDate] = useState('');
  const [impressions, setImpressions] = useState('');
  const [clicks, setClicks] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!reportDate) {
      setFormError('A data do relatório é obrigatória.');
      return;
    }

    const performanceEntry = {
      report_date: reportDate,
      impressions: impressions ? parseInt(impressions, 10) : 0,
      clicks: clicks ? parseInt(clicks, 10) : 0,
    };

    try {
      await axios.post(`http://localhost:3001/api/campaigns/${campaignId}/performance`, performanceEntry);
      setFormSuccess('Dados de performance adicionados com sucesso!');
      setReportDate('');
      setImpressions('');
      setClicks('');
      if (onDataAdded) {
        onDataAdded(); 
      }
    } catch (err) {
      console.error("Erro ao adicionar dados de performance:", err);
      setFormError(err.response?.data?.message || 'Falha ao adicionar dados de performance.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h4>Adicionar Performance Diária</h4>
      {formError && <p style={{ color: 'red' }}>{formError}</p>}
      {formSuccess && <p style={{ color: 'green' }}>{formSuccess}</p>}
      <div>
        <label htmlFor="reportDate">Data: </label>
        <input
          type="date"
          id="reportDate"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          required
          style={{ marginRight: '10px' }}
        />
      </div>
      <div style={{ marginTop: '10px' }}>
        <label htmlFor="impressions">Impressões: </label>
        <input
          type="number"
          id="impressions"
          value={impressions}
          min="0"
          onChange={(e) => setImpressions(e.target.value)}
          style={{ marginRight: '10px' }}
        />
      </div>
      <div style={{ marginTop: '10px' }}>
        <label htmlFor="clicks">Cliques: </label>
        <input
          type="number"
          id="clicks"
          value={clicks}
          min="0"
          onChange={(e) => setClicks(e.target.value)}
          style={{ marginRight: '10px' }}
        />
      </div>
      <button type="submit" style={{ marginTop: '15px' }}>Adicionar Dados</button>
    </form>
  );
}


function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [dailyPerformance, setDailyPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performanceError, setPerformanceError] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);

  const API_URL_BASE = 'http://localhost:3001/api/campaigns';

  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);
      setPerformanceError(null);

      try {
        const campaignDetailsPromise = axios.get(`${API_URL_BASE}/${id}`);
        const dailyPerformancePromise = axios.get(`${API_URL_BASE}/${id}/performance`);

        const [campaignDetailsResponse, dailyPerformanceResponse] = await Promise.all([
          campaignDetailsPromise,
          dailyPerformancePromise
        ]);

        setCampaign(campaignDetailsResponse.data);
        setDailyPerformance(dailyPerformanceResponse.data);

      } catch (err) {
        console.error("Erro ao buscar dados da campanha:", err);
        if (err.config.url.includes('/performance')) {
            setPerformanceError(err.response?.data?.message || err.message || 'Falha ao buscar dados de performance');
        } else {
            setError(err.response?.data?.message || err.message || 'Falha ao buscar detalhes da campanha');
        }
        setCampaign(null);
        setDailyPerformance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignData();
  }, [id, dataVersion]); 

  const handlePerformanceDataAdded = () => {
    setDataVersion(prevVersion => prevVersion + 1);
  };

  if (loading) {
    return <p>Carregando dados da campanha...</p>;
  }

  if (error) {
    return (
      <div>
        <p>Erro ao carregar detalhes da campanha: {error}</p>
        <Link to="/">Voltar para a Lista de Campanhas</Link>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div>
        <p>Campanha não encontrada.</p>
        <Link to="/">Voltar para a Lista de Campanhas</Link>
      </div>
    );
  }

  const sortedPerformanceData = [...dailyPerformance].sort((a, b) => new Date(a.report_date) - new Date(b.report_date));

  const chartLabels = sortedPerformanceData.map(d => new Date(d.report_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }));
  const impressionData = sortedPerformanceData.map(d => d.impressions);
  const clickData = sortedPerformanceData.map(d => d.clicks);

  const chartDataConfig = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Impressões',
        data: impressionData,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Cliques',
        data: clickData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', },
      title: { display: true, text: 'Métricas de Performance Diária', font: { size: 16 } },
      tooltip: { mode: 'index', intersect: false, }
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Contagem' } },
      x: { title: { display: true, text: 'Data' } }
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Link to="/">{'<'} Voltar para a Lista de Campanhas</Link>
      <h2>Detalhes da Campanha: {campaign.name}</h2>
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px', background: '#f9f9f9' }}>
        <p><strong>ID:</strong> {campaign.id}</p>
        <p><strong>Status:</strong> {campaign.status}</p>
        <p><strong>Data de Início:</strong> {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}</p>
        <p><strong>Data de Término:</strong> {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}</p>
        <p><strong>Orçamento:</strong> {campaign.budget != null ? `R$${Number(campaign.budget).toFixed(2).replace('.',',')}` : 'N/A'}</p>
        <p><strong>Total de Impressões (da view):</strong> {campaign.total_impressions}</p>
        <p><strong>Total de Cliques (da view):</strong> {campaign.total_clicks}</p>
        <p><strong>CTR (da view):</strong> {campaign.ctr}%</p>
      </div>

      <PerformanceDataForm campaignId={campaign.id} onDataAdded={handlePerformanceDataAdded} />

      <h3>Gráfico de Performance</h3>
      {performanceError && <p style={{color: 'red'}}>Erro ao carregar dados de performance: {performanceError}</p>}
      {!performanceError && sortedPerformanceData.length > 0 ? (
         <div style={{ height: '400px', maxWidth: '700px', margin: '20px auto', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <Line options={chartOptions} data={chartDataConfig} />
         </div>
      ) : !performanceError && (
        <p>Nenhum dado de performance disponível para exibir o gráfico. Adicione alguns dados usando o formulário acima.</p>
      )}

      <h3>Registro de Dados de Performance</h3>
      {!performanceError && sortedPerformanceData.length > 0 ? (
        <table style={{ marginTop: '10px', width: 'auto', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{border: '1px solid #ddd', padding: '8px'}}>Data</th>
              <th style={{border: '1px solid #ddd', padding: '8px'}}>Impressões</th>
              <th style={{border: '1px solid #ddd', padding: '8px'}}>Cliques</th>
            </tr>
          </thead>
          <tbody>
          {sortedPerformanceData.map(perf => (
            <tr key={`${campaign.id}-${perf.report_date}-${perf.id}`}> 
              <td style={{border: '1px solid #ddd', padding: '8px'}}>{new Date(perf.report_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
              <td style={{border: '1px solid #ddd', padding: '8px'}}>{perf.impressions}</td>
              <td style={{border: '1px solid #ddd', padding: '8px'}}>{perf.clicks}</td>
            </tr>
          ))}
          </tbody>
        </table>
      ) : !performanceError && (
        <p>Nenhum dado de performance disponível para esta campanha.</p>
      )}
    </div>
  );
}

export default CampaignDetail;