import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../../components/ui/Button';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn, formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PricingRulesManager = () => {
  const { pricingRules, addPricingRule, updatePricingRule, deletePricingRule, properties } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    property_id: null,
    rule_type: 'day_of_week',
    days: [],
    day_of_week: null,
    specific_date: '',
    start_date: '',
    end_date: '',
    nightly_rate: 100,
    priority: 0
  });

  const handleEdit = (rule) => {
    setEditingId(rule.id);
    setFormData({
      name: rule.name,
      property_id: rule.property_id,
      rule_type: rule.rule_type,
      days: rule.days || [],
      day_of_week: rule.day_of_week,
      specific_date: rule.specific_date || '',
      start_date: rule.start_date || '',
      end_date: rule.end_date || '',
      nightly_rate: rule.nightly_rate,
      priority: rule.priority || 0
    });
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('Please provide a rule name');
      return;
    }

    if (formData.rule_type === 'day_of_week' && formData.days.length === 0) {
      alert('Please select at least one day of the week');
      return;
    }

    if (formData.rule_type === 'date_override' && !formData.specific_date) {
      alert('Please select a specific date');
      return;
    }

    if (formData.rule_type === 'date_range' && (!formData.start_date || !formData.end_date)) {
      alert('Please select both start and end dates');
      return;
    }

    const ruleData = {
      ...formData,
      property_id: formData.property_id === '' ? null : formData.property_id
    };

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

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: '',
      property_id: null,
      rule_type: 'day_of_week',
      days: [],
      day_of_week: null,
      specific_date: '',
      start_date: '',
      end_date: '',
      nightly_rate: 100,
      priority: 0
    });
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

  const toggleDay = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(dayIndex)
        ? prev.days.filter(d => d !== dayIndex)
        : [...prev.days, dayIndex].sort()
    }));
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pricing Rules</h1>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} icon={FiIcons.FiPlus}>
            Add Rule
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">
            {editingId ? 'Edit Pricing Rule' : 'New Pricing Rule'}
          </h3>
          <div className="space-y-4">
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
              <label className="block text-sm font-bold text-gray-700 mb-1">Applies To</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                value={formData.property_id || ''}
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value || null })}
              >
                <option value="">All Properties</option>
                {properties.map(prop => (
                  <option key={prop.id} value={prop.id}>{prop.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Rule Type *</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, rule_type: 'day_of_week' })}
                  className={cn(
                    "p-3 rounded-lg border-2 font-bold text-sm transition-all",
                    formData.rule_type === 'day_of_week'
                      ? "border-primary bg-blue-50 text-primary"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  )}
                >
                  Day of Week
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, rule_type: 'date_override' })}
                  className={cn(
                    "p-3 rounded-lg border-2 font-bold text-sm transition-all",
                    formData.rule_type === 'date_override'
                      ? "border-primary bg-blue-50 text-primary"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  )}
                >
                  Specific Date
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, rule_type: 'date_range' })}
                  className={cn(
                    "p-3 rounded-lg border-2 font-bold text-sm transition-all",
                    formData.rule_type === 'date_range'
                      ? "border-primary bg-blue-50 text-primary"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  )}
                >
                  Date Range
                </button>
              </div>
            </div>

            {formData.rule_type === 'day_of_week' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Days of Week *</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day, idx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-bold transition-all border",
                        formData.days.includes(idx)
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                      )}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formData.rule_type === 'date_override' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Specific Date *</label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                  value={formData.specific_date}
                  onChange={(e) => setFormData({ ...formData, specific_date: e.target.value })}
                />
              </div>
            )}

            {formData.rule_type === 'date_range' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nightly Rate ($) *</label>
                <input
                  type="number"
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                  value={formData.nightly_rate}
                  onChange={(e) => setFormData({ ...formData, nightly_rate: parseFloat(e.target.value) })}
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
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Higher priority wins when multiple rules match</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={handleSave}>
              {editingId ? 'Update Rule' : 'Create Rule'}
            </Button>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {pricingRules.map((rule) => (
          <div key={rule.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg text-gray-900">{rule.name}</h3>
                {rule.property_id && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                    {properties.find(p => p.id === rule.property_id)?.name || 'Unknown Property'}
                  </span>
                )}
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">
                  Priority: {rule.priority || 0}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <SafeIcon icon={FiIcons.FiTag} className="inline mr-1" />
                  <span className="font-semibold">
                    {rule.rule_type === 'day_of_week' && 'Day of Week'}
                    {rule.rule_type === 'date_override' && 'Specific Date'}
                    {rule.rule_type === 'date_range' && 'Date Range'}
                  </span>
                </p>
                {rule.rule_type === 'day_of_week' && rule.days && (
                  <p>
                    <SafeIcon icon={FiIcons.FiCalendar} className="inline mr-1" />
                    {rule.days.map(d => DAYS[d].slice(0, 3)).join(', ')}
                  </p>
                )}
                {rule.rule_type === 'date_override' && rule.specific_date && (
                  <p>
                    <SafeIcon icon={FiIcons.FiCalendar} className="inline mr-1" />
                    {format(new Date(rule.specific_date), 'MMM d, yyyy')}
                  </p>
                )}
                {rule.rule_type === 'date_range' && rule.start_date && rule.end_date && (
                  <p>
                    <SafeIcon icon={FiIcons.FiCalendar} className="inline mr-1" />
                    {format(new Date(rule.start_date), 'MMM d, yyyy')} - {format(new Date(rule.end_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right flex items-center gap-4 ml-4">
              <span className="text-xl font-bold text-primary">{formatCurrency(rule.nightly_rate)}/night</span>
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
        {pricingRules.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <SafeIcon icon={FiIcons.FiDollarSign} className="mx-auto text-4xl text-gray-300 mb-2" />
            <p className="text-gray-500">No pricing rules created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingRulesManager;