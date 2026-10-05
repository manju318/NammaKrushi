import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { farmService } from '../services/farmService';
import api from '../services/api';
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  User,
  Sprout,
  Save
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isFarmer, isVerifiedSeller } = useAuth();

  const [idType, setIdType] = useState('Kisan Credit Card & RTC');
  const [idNumber, setIdNumber] = useState('');
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);

  // Farm details
  const [acreage, setAcreage] = useState(user?.farmer_profile?.total_acreage || 5.0);
  const [soilType, setSoilType] = useState(user?.farmer_profile?.soil_type || 'Red Loam');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleApplyVerification = async (e) => {
    e.preventDefault();
    setKycLoading(true);
    try {
      // In production, submits KYC application to admin queue
      await new Promise(r => setTimeout(r, 600));
      setKycSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setKycLoading(false);
    }
  };

  const handleSaveFarmSettings = async (e) => {
    e.preventDefault();
    try {
      await farmService.updateFarm({
        size_in_acres: parseFloat(acreage),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-forest-600" />
          <span>Profile & Account Settings</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your agricultural profile, farm acreage parameters, and seller KYC verification.
        </p>
      </div>

      {/* User Information Card */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-forest-600" />
          <span>Account Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-500 font-medium block">Full Name</label>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{user?.full_name}</div>
          </div>
          <div>
            <label className="text-slate-500 font-medium block">Email Address</label>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{user?.email}</div>
          </div>
          <div>
            <label className="text-slate-500 font-medium block">Account Role</label>
            <div className="font-semibold text-forest-700 capitalize mt-0.5">{user?.role}</div>
          </div>
          <div>
            <label className="text-slate-500 font-medium block">Registered Phone</label>
            <div className="font-semibold text-slate-800 mt-0.5">{user?.phone || 'Not provided'}</div>
          </div>
        </div>
      </div>

      {/* Verified Seller KYC Application (Farmers only) */}
      {isFarmer && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-forest-600" />
              <span>Direct Marketplace - Verified Seller Badge</span>
            </h3>

            {isVerifiedSeller ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified Seller
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 font-semibold text-xs rounded-full">
                Verification Pending
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Verified sellers receive a prominent green verification badge on all marketplace produce cards. Buyers trust verified farmers, boosting order conversion rates and direct wholesale contracts.
          </p>

          {isVerifiedSeller ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
              <span className="font-bold block">✓ KYC Verification Complete</span>
              <p>Your land records and credentials have been verified by the administrator. Your listings are featured with the verified badge.</p>
            </div>
          ) : kycSubmitted ? (
            <div className="p-4 bg-forest-50 border border-forest-200 rounded-2xl text-xs text-forest-900">
              <span className="font-bold block">KYC Application Submitted!</span>
              <p className="mt-1">Your document has been submitted to the admin moderation queue. You will receive an in-app alert upon approval.</p>
            </div>
          ) : (
            <form onSubmit={handleApplyVerification} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Verification Document Type</label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Kisan Credit Card & RTC">Kisan Credit Card (KCC) & Land RTC</option>
                    <option value="Aadhaar Card & Pattadar Passbook">Aadhaar Card & Pattadar Passbook</option>
                    <option value="APMC Farmer Identity Card">APMC Farmer Identity Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Document / Certificate ID Number</label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. KCC-KA-2024-9988"
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={kycLoading || !idNumber.trim()}
                className="px-5 py-2.5 bg-forest-600 hover:bg-forest-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                {kycLoading ? 'Submitting Application...' : 'Submit for Admin Verification'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Farm Acreage & Soil Settings */}
      {isFarmer && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Sprout className="w-4 h-4 text-forest-600" />
            <span>Farm Acreage & Soil Calibration</span>
          </h3>

          <form onSubmit={handleSaveFarmSettings} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Total Cultivable Area (Acres)</label>
                <input
                  type="number"
                  step="0.5"
                  value={acreage}
                  onChange={(e) => setAcreage(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Dominant Soil Type</label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="Red Loam">Red Loam</option>
                  <option value="Black Cotton">Black Cotton</option>
                  <option value="Clayey Loam">Clayey Loam</option>
                  <option value="Alluvial">Alluvial</option>
                  <option value="Sandy Loam">Sandy Loam</option>
                </select>
              </div>
            </div>

            {savedSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Farm parameters updated successfully.
              </div>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
