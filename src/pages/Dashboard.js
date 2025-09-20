import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { get, post } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';

const Dashboard = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await get({
        apiName: 'contentLocalizerApi',
        path: '/campaigns'
      });
      const data = await response.response.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    try {
      const user = await getCurrentUser();
      const campaignData = {
        campaignName: newCampaignName.trim(),
        createdBy: user.username,
        status: 'active'
      };

      const response = await post({
        apiName: 'contentLocalizerApi',
        path: '/campaigns',
        options: {
          body: campaignData
        }
      });
      const data = await response.response.json();

      setCampaigns([...campaigns, data.campaign]);
      setNewCampaignName('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError('Failed to create campaign');
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'status active';
      case 'pending':
        return 'status pending';
      case 'completed':
        return 'status completed';
      default:
        return 'status pending';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading campaigns...</h2>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Campaign Dashboard</h1>
        <button 
          className="btn" 
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create New Campaign'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="card">
          <h3>Create New Campaign</h3>
          <form onSubmit={createCampaign}>
            <div className="form-group">
              <label htmlFor="campaignName">Campaign Name</label>
              <input
                type="text"
                id="campaignName"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="Enter campaign name"
                required
              />
            </div>
            <button type="submit" className="btn">
              Create Campaign
            </button>
          </form>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="card">
          <h3>No campaigns found</h3>
          <p>Create your first campaign to get started with content localization.</p>
        </div>
      ) : (
        <div className="campaign-grid">
          {campaigns.map((campaign) => (
            <div key={campaign.campaignId} className="campaign-card">
              <h3>{campaign.campaignName}</h3>
              <div className="campaign-meta">
                <p><strong>Status:</strong> <span className={getStatusClass(campaign.status)}>{campaign.status}</span></p>
                <p><strong>Created:</strong> {new Date(campaign.createdAt).toLocaleDateString()}</p>
                <p><strong>Locales:</strong> {campaign.locales?.length || 0}</p>
                <p><strong>Files:</strong> {campaign.fileCount || 0}</p>
              </div>
              <div className="campaign-actions">
                <Link to={`/campaign/${campaign.campaignId}`} className="btn">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
