import { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, Link } from 'react-router-dom';
import CampaignForm from './CampaignForm';
import CampaignDetail from './CampaignDetail';
// Se você criou o arquivo utils.js, importe a função:
// import { translateStatus } from './utils'; 
import './App.css';

// Se você NÃO criou utils.js e definiu diretamente em App.jsx,
// certifique-se que statusTranslations e translateStatus estão definidas aqui:
const statusTranslations = {
  draft: 'Rascunho',
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
  archived: 'Arquivada',
};
const translateStatus = (statusKey) => statusTranslations[statusKey] || statusKey;


function CampaignListPage({ campaigns, loading, error, showForm, editingCampaign,
                            handleShowCreateForm, handleFormSubmit, handleCancelForm,
                            handleEditClick, handleDeleteCampaign }) {
  if (loading && !showForm) {
    return <p>Carregando campanhas...</p>;
  }

  if (error && !showForm && !editingCampaign) {
    return <p>Erro: {error}</p>;
  }

  return (
    <div>
      {!showForm && (
        <button onClick={handleShowCreateForm} style={{ marginBottom: '20px' }}>
          Criar Nova Campanha
        </button>
      )}

      {showForm && (
        <CampaignForm
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
          existingCampaign={editingCampaign}
        />
      )}
      {error && (showForm || editingCampaign) && <p style={{color: 'red'}}>Erro: {error}</p>}

      {campaigns.length === 0 && !loading && !showForm ? (
        <p>Nenhuma campanha encontrada.</p>
      ) : !showForm && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Status</th>
              <th>Data de Início</th>
              <th>Orçamento</th>
              <th>Total de Impressões</th>
              <th>Total de Cliques</th>
              <th>CTR (%)</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td>{campaign.id}</td>
                <td>
                  <Link to={`/campaign/${campaign.id}`}>{campaign.name}</Link>
                </td>
                {/* PONTO CRÍTICO PARA A TRADUÇÃO DO STATUS NA LISTA */}
                <td>{translateStatus(campaign.status)}</td>
                <td>{campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}</td>
                <td>{campaign.budget}</td>
                <td>{campaign.total_impressions}</td>
                <td>{campaign.total_clicks}</td>
                <td>{campaign.ctr}</td>
                <td>
                  <button onClick={() => handleEditClick(campaign)} style={{ marginRight: '5px' }}>Editar</button>
                  <button onClick={() => handleDeleteCampaign(campaign.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


function App() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const API_URL = 'http://localhost:3001/api/campaigns';

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      setCampaigns(response.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Falha ao buscar campanhas');
      setCampaigns([]);
      console.error("Erro ao buscar campanhas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleFormSubmit = async (campaignData, campaignId) => {
    try {
      if (campaignId) {
        await axios.put(`${API_URL}/${campaignId}`, campaignData);
      } else {
        await axios.post(API_URL, campaignData);
      }
      fetchCampaigns();
      setShowForm(false);
      setEditingCampaign(null);
      setError(null);
    } catch (err) {
      console.error("Erro ao enviar formulário:", err.response ? err.response.data : err.message);
      setError(err.response?.data?.message || `Falha ao ${campaignId ? 'atualizar' : 'criar'} campanha`);
    }
  };

  const handleEditClick = (campaign) => {
    setEditingCampaign(campaign);
    setShowForm(true);
    setError(null);
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (window.confirm('Tem certeza que deseja excluir esta campanha?')) {
      try {
        await axios.delete(`${API_URL}/${campaignId}`);
        fetchCampaigns();
      } catch (err) {
        console.error("Erro ao excluir campanha:", err.response ? err.response.data : err.message);
        setError(err.response?.data?.message || 'Falha ao excluir campanha');
      }
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCampaign(null);
    setError(null);
  };

  const handleShowCreateForm = () => {
    setEditingCampaign(null);
    setShowForm(true);
    setError(null);
  };

  return (
    <div className="App">
      <h1>Painel de Campanhas</h1>
      <Routes>
        <Route
          path="/"
          element={
            <CampaignListPage
              campaigns={campaigns}
              loading={loading}
              error={error}
              showForm={showForm}
              editingCampaign={editingCampaign}
              handleShowCreateForm={handleShowCreateForm}
              handleFormSubmit={handleFormSubmit}
              handleCancelForm={handleCancelForm}
              handleEditClick={handleEditClick}
              handleDeleteCampaign={handleDeleteCampaign}
            />
          }
        />
        <Route path="/campaign/:id" element={<CampaignDetail />} />
      </Routes>
    </div>
  );
}

export default App;