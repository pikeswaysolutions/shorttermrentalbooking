import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../ui/Button';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const POLICY_FIELDS = [
  { key: 'payment', label: 'Booking & Payment Terms' },
  { key: 'cancellation', label: 'Cancellation Policy' },
  { key: 'liability', label: 'Liability & Insurance' },
  { key: 'cleanup', label: 'Setup & Cleanup' },
];

const PropertyPoliciesTab = ({ propertyId }) => {
  const { properties, updateProperty, settings } = useStore();
  const property = properties.find(p => p.id === propertyId);

  const [policies, setPolicies] = useState({ payment: '', cancellation: '', liability: '', cleanup: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (property?.rentalPolicies) {
      setPolicies({
        payment: property.rentalPolicies.payment || '',
        cancellation: property.rentalPolicies.cancellation || '',
        liability: property.rentalPolicies.liability || '',
        cleanup: property.rentalPolicies.cleanup || '',
      });
    } else {
      setPolicies({ payment: '', cancellation: '', liability: '', cleanup: '' });
    }
  }, [property?.rentalPolicies]);

  const hasContent = Object.values(policies).some(v => v.trim() !== '');

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProperty({ ...property, rentalPolicies: hasContent ? policies : null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.message || 'Failed to save policies.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear property-specific policies? Guests will see the global default policies instead.')) return;
    setSaving(true);
    try {
      await updateProperty({ ...property, rentalPolicies: null });
      setPolicies({ payment: '', cancellation: '', liability: '', cleanup: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.message || 'Failed to clear policies.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <SafeIcon icon={FiIcons.FiInfo} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-bold mb-1">Property-Specific Policies</p>
          <p>
            Policies set here override the global defaults for this property only.
            Leave all fields blank to use the{' '}
            <span className="font-semibold">global rental policies</span> from Settings.
          </p>
        </div>
      </div>

      {property?.rentalPolicies && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-800">
          <SafeIcon icon={FiIcons.FiCheck} className="text-green-600 flex-shrink-0" />
          <span className="font-medium">This property has custom policies configured.</span>
        </div>
      )}

      {!property?.rentalPolicies && settings?.rentalPolicies && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-800">
          <SafeIcon icon={FiIcons.FiAlertCircle} className="text-amber-600 flex-shrink-0" />
          <span>No custom policies set. Guests will see the global default policies.</span>
        </div>
      )}

      <div className="space-y-4">
        {POLICY_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 h-28 text-sm"
              value={policies[key]}
              onChange={(e) => setPolicies(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={
                settings?.rentalPolicies?.[key]
                  ? `Global default: "${settings.rentalPolicies[key].slice(0, 80)}…"`
                  : `Enter ${label.toLowerCase()}...`
              }
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Policies'}
        </Button>
        {property?.rentalPolicies && (
          <Button variant="outline" onClick={handleClear} disabled={saving}>
            <SafeIcon icon={FiIcons.FiRefreshCw} className="mr-1" />
            Use Global Defaults
          </Button>
        )}
      </div>
    </div>
  );
};

export default PropertyPoliciesTab;
