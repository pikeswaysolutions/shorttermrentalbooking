import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../ui/Button';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const PropertyAutomationsTab = ({ propertyId }) => {
  const { properties, updateProperty } = useStore();
  const property = properties.find(p => p.id === propertyId);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setWebhookUrl(property?.webhookUrl || '');
  }, [property?.webhookUrl]);

  const handleSave = async () => {
    const trimmed = webhookUrl.trim();
    if (trimmed && !trimmed.startsWith('http')) {
      setError('Webhook URL must start with http:// or https://');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await updateProperty({ ...property, webhookUrl: trimmed || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Failed to save webhook URL.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Remove the webhook URL for this property? Automation triggers will stop firing.')) return;
    setSaving(true);
    setError('');
    try {
      await updateProperty({ ...property, webhookUrl: null });
      setWebhookUrl('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Failed to remove webhook URL.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <SafeIcon icon={FiIcons.FiZap} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-bold mb-1">Webhook Automation</p>
          <p>
            When a booking for this property is confirmed by an admin, a POST request
            with the full reservation details will be sent to the URL below.
            Compatible with <span className="font-semibold">Zapier</span>,{' '}
            <span className="font-semibold">Make</span>, and any HTTP webhook endpoint.
          </p>
        </div>
      </div>

      {property?.webhookUrl && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-800">
          <SafeIcon icon={FiIcons.FiCheckCircle} className="text-green-600 flex-shrink-0" />
          <span className="font-medium">Webhook is active for this property.</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">
          Webhook URL
        </label>
        <input
          type="url"
          className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={webhookUrl}
          onChange={(e) => { setWebhookUrl(e.target.value); setError(''); }}
          placeholder="https://hooks.zapier.com/hooks/catch/..."
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
            <SafeIcon icon={FiIcons.FiAlertCircle} className="flex-shrink-0" />
            {error}
          </p>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Payload Preview</p>
        <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto">
{`{
  "event": "booking.confirmed",
  "booking_id": "<uuid>",
  "property_name": "${property?.name || 'Property Name'}",
  "check_in_date": "YYYY-MM-DD",
  "check_out_date": "YYYY-MM-DD",
  "nights": 3,
  "guest_count": 2,
  "contact_name": "Guest Name",
  "contact_email": "guest@example.com",
  "contact_phone": "+1 555-000-0000",
  "total_price": 450.00,
  "confirmed_at": "ISO timestamp"
}`}
        </pre>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Webhook URL'}
        </Button>
        {property?.webhookUrl && (
          <Button variant="outline" onClick={handleClear} disabled={saving}>
            <SafeIcon icon={FiIcons.FiTrash2} className="mr-1" />
            Remove Webhook
          </Button>
        )}
      </div>
    </div>
  );
};

export default PropertyAutomationsTab;
