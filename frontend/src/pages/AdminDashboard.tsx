import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Subscriber {
  id: string;
  email: string;
  name: string;
  tier: string;
}

const AdminDashboard = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/admin/subscribers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubscribers(response.data);
      } catch (error) {
        console.error('Error fetching subscribers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscribers();
  }, [token]);

  const handleTierChange = async (userId: string, newTier: string) => {
    try {
        await axios.patch(`http://localhost:3001/api/admin/subscribers/${userId}/tier`, { tier: newTier }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setSubscribers(subscribers.map(s => s.id === userId ? { ...s, tier: newTier } : s));
    } catch (error) {
        console.error('Error updating tier:', error);
    }
  };

  const handleCancel = async (userId: string) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) return;
    try {
        await axios.delete(`http://localhost:3001/api/admin/subscribers/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setSubscribers(subscribers.filter(s => s.id !== userId));
    } catch (error) {
        console.error('Error canceling subscription:', error);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading admin panel...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Panel - Subscriber Management</h1>
      
      <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subscribers.map((sub) => (
              <tr key={sub.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select
                        value={sub.tier}
                        onChange={(e) => handleTierChange(sub.id, e.target.value)}
                        className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="Starter">Starter</option>
                        <option value="Pro">Pro</option>
                        <option value="Enterprise">Enterprise</option>
                    </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => handleCancel(sub.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Cancel Subscription
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
