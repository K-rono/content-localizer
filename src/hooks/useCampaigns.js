import { useState, useEffect } from 'react';
import { get, post, put, del } from 'aws-amplify/api';
import { API_ENDPOINTS, API_NAME } from '../constants/api';

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await get({
        apiName: API_NAME,
        path: API_ENDPOINTS.CAMPAIGNS
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

  const createCampaign = async (campaignData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await post({
        apiName: API_NAME,
        path: API_ENDPOINTS.CAMPAIGNS,
        options: {
          body: campaignData
        }
      });
      const data = await response.response.json();
      setCampaigns(prev => [...prev, data.campaign]);
      return data.campaign;
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError('Failed to create campaign');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCampaign = async (campaignId, updates) => {
    try {
      setLoading(true);
      setError(null);
      const response = await API.put(API_NAME, API_ENDPOINTS.CAMPAIGN_DETAIL(campaignId), {
        body: updates
      });
      setCampaigns(prev => 
        prev.map(campaign => 
          campaign.campaignId === campaignId 
            ? { ...campaign, ...response.campaign }
            : campaign
        )
      );
      return response.campaign;
    } catch (err) {
      console.error('Error updating campaign:', err);
      setError('Failed to update campaign');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      await API.del(API_NAME, API_ENDPOINTS.CAMPAIGN_DETAIL(campaignId));
      setCampaigns(prev => prev.filter(campaign => campaign.campaignId !== campaignId));
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setError('Failed to delete campaign');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return {
    campaigns,
    loading,
    error,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign
  };
};
