import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../ui/Button';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn, formatCurrency } from '../../lib/utils';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: 50,
  type: 'flat',
  active: true,
};

const PropertyAddOnsTab = ({ propertyId }) => {
  const { addOns, addAddOn, updateAddOn, deleteAddOn } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const propertyAddOns = addOns.filter(
    a => a.propertyIds && a.propertyIds.includes(propertyId)
  );

  const handleEdit = (addon) => {
    setEditingId(addon.id);
    setFormData({
      name: addon.name,
      description: addon.description,
      price: addon.price,
      type: addon.type,
      active: addon.active,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const existing = addOns.find(a => a.id === editingId);
        const propertyIds = existing?.propertyIds || [];
        await updateAddOn(editingId, {
          ...formData,
          propertyIds: propertyIds.includes(propertyId) ? propertyIds : [...propertyIds, propertyId],
        });
      } else {
        await addAddOn({ ...formData, propertyIds: [propertyId] });
      }
      handleCancel();
    } catch (err) {
      alert(err.message || 'Failed to save add-on.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this add-on?')) {
      try {
        await deleteAddOn(id);
      } catch (err) {
        alert(err.message || 'Failed to delete add-on.');
      }
    }
  };

  return (
    <div className="space-y-4">
      {!isAdding && (
        <div className="flex justify-end">
          <Button onClick={() => setIsAdding(true)} icon={FiIcons.FiPlus} size="sm">
            Add New
          </Button>
        </div>
      )}

      {isAdding && (
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
          <h4 className="font-bold text-gray-900">{editingId ? 'Edit Add-on' : 'New Add-on'}</h4>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Add-on Name *</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Early Check-in"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Description *</label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 h-20"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this add-on"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Price ($) *</label>
              <input
                type="number"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                min="0"
                step="5"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Pricing Type *</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="flat">Flat Rate</option>
                <option value="per_night">Per Night</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="addon-active"
              className="w-4 h-4 text-primary border-gray-300 rounded"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            />
            <label htmlFor="addon-active" className="text-sm font-medium text-gray-700">
              Active (visible to customers)
            </label>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {editingId ? 'Update' : 'Create'} Add-on
            </Button>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {propertyAddOns.map((addon) => (
          <div key={addon.id} className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-gray-900">{addon.name}</h4>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded font-bold uppercase',
                    addon.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  )}>
                    {addon.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{addon.description}</p>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span className="font-medium">
                    Price: <span className="text-primary font-bold">{formatCurrency(addon.price)}</span>
                  </span>
                  <span className="font-medium">
                    Type: <span className="text-gray-900 font-bold">{addon.type === 'flat' ? 'Flat Rate' : 'Per Night'}</span>
                  </span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm" variant="outline" onClick={() => handleEdit(addon)}>
                  <SafeIcon icon={FiIcons.FiEdit2} />
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(addon.id)}>
                  <SafeIcon icon={FiIcons.FiTrash2} />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {propertyAddOns.length === 0 && !isAdding && (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <SafeIcon icon={FiIcons.FiPackage} className="mx-auto text-3xl text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No add-ons for this property yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyAddOnsTab;
