import React, { useState } from 'react';
import { format } from 'date-fns';
import { useStore } from '../../context/StoreContext';
import { Button } from '../ui/Button';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn, formatCurrency } from '../../lib/utils';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const EMPTY_FORM = {
  name: '',
  ruleType: 'day_of_week',
  days: [],
  dayOfWeek: null,
  specificDate: '',
  startDate: '',
  endDate: '',
  nightlyRate: 100,
  priority: 0,
};

const PropertyPricingTab = ({ propertyId }) => {
  const { pricingRules, addPricingRule, updatePricingRule, deletePricingRule } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const propertyRules = pricingRules.filter(r => r.propertyId === propertyId);

  const handleEdit = (rule) => {
    setEditingId(rule.id);
    setFormData({
      name: rule.name,
      ruleType: rule.ruleType,
      days: rule.days || [],
      dayOfWeek: rule.dayOfWeek,
      specificDate: rule.specificDate || '',
      startDate: rule.startDate || '',
      endDate: rule.endDate || '',
      nightlyRate: rule.nightlyRate,
      priority: rule.priority || 0,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const toggleDay = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(dayIndex)
        ? prev.days.filter(d => d !== dayIndex)
        : [...prev.days, dayIndex].sort(),
    }));
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('Please provide a rule name');
      return;
    }
    if (formData.ruleType === 'day_of_week' && formData.days.length === 0) {
      alert('Please select at least one day of the week');
      return;
    }
    if (formData.ruleType === 'date_override' && !formData.specificDate) {
      alert('Please select a specific date');
      return;
    }
    if (formData.ruleType === 'date_range' && (!formData.startDate || !formData.endDate)) {
      alert('Please select both start and end dates');
      return;
    }

    const ruleData = { ...formData, propertyId };

    setSaving(true);
    try {
      if (editingId) {
        await updatePricingRule(editingId, ruleData);
      } else {
        await addPricingRule(ruleData);
      }
      handleCancel();
    } catch (err) {
      alert(err.message || 'Failed to save rule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      try {
        await deletePricingRule(id);
      } catch (err) {
        alert(err.message || 'Failed to delete rule.');
      }
    }
  };

  return (
    <div className="space-y-4">
      {!isAdding && (
        <div className="flex justify-end">
          <Button onClick={() => setIsAdding(true)} icon={FiIcons.FiPlus} size="sm">
            Add Rule
          </Button>
        </div>
      )}

      {isAdding && (
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
          <h4 className="font-bold text-gray-900">{editingId ? 'Edit Pricing Rule' : 'New Pricing Rule'}</h4>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Rule Name *</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Weekend Peak"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Rule Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'day_of_week', label: 'Day of Week' },
                { value: 'date_override', label: 'Specific Date' },
                { value: 'date_range', label: 'Date Range' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, ruleType: opt.value })}
                  className={cn(
                    'p-2.5 rounded-lg border-2 font-bold text-sm transition-all',
                    formData.ruleType === opt.value
                      ? 'border-primary bg-blue-50 text-primary'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {formData.ruleType === 'day_of_week' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Days of Week *</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-bold transition-all border',
                      formData.days.includes(idx)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    )}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {formData.ruleType === 'date_override' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Specific Date *</label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                value={formData.specificDate}
                onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })}
              />
            </div>
          )}

          {formData.ruleType === 'date_range' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nightly Rate ($) *</label>
              <input
                type="number"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                value={formData.nightlyRate}
                onChange={(e) => setFormData({ ...formData, nightlyRate: parseFloat(e.target.value) })}
                min="0"
                step="10"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Priority</label>
              <input
                type="number"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Higher wins when multiple rules match</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {editingId ? 'Update Rule' : 'Create Rule'}
            </Button>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {propertyRules.map((rule) => (
          <div key={rule.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-gray-900">{rule.name}</h4>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                  Priority: {rule.priority || 0}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-0.5">
                <p>
                  <span className="font-semibold">
                    {rule.ruleType === 'day_of_week' && 'Day of Week'}
                    {rule.ruleType === 'date_override' && 'Specific Date'}
                    {rule.ruleType === 'date_range' && 'Date Range'}
                  </span>
                </p>
                {rule.ruleType === 'day_of_week' && rule.days && (
                  <p className="text-xs text-gray-500">{rule.days.map(d => DAYS[d].slice(0, 3)).join(', ')}</p>
                )}
                {rule.ruleType === 'date_override' && rule.specificDate && (
                  <p className="text-xs text-gray-500">{format(new Date(rule.specificDate + 'T00:00:00'), 'MMM d, yyyy')}</p>
                )}
                {rule.ruleType === 'date_range' && rule.startDate && rule.endDate && (
                  <p className="text-xs text-gray-500">
                    {format(new Date(rule.startDate + 'T00:00:00'), 'MMM d, yyyy')} – {format(new Date(rule.endDate + 'T00:00:00'), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <span className="text-lg font-bold text-primary">{formatCurrency(rule.nightlyRate)}/night</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(rule)}>
                  <SafeIcon icon={FiIcons.FiEdit2} />
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(rule.id)}>
                  <SafeIcon icon={FiIcons.FiTrash2} />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {propertyRules.length === 0 && !isAdding && (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <SafeIcon icon={FiIcons.FiDollarSign} className="mx-auto text-3xl text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No pricing rules for this property yet.</p>
            <p className="text-xs text-gray-400 mt-1">Base nightly rate applies by default.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPricingTab;
