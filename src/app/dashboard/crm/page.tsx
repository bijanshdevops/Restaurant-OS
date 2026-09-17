"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getCustomers,
  createCustomer,
  getCustomerDetail,
  addCustomerNote,
  updateCustomerProfile,
  getCustomerSegmentPreview,
  getDistinctCustomerTags,
  getUpcomingBirthdayCustomers,
} from '@/app/actions/crm';
import { createCampaign, sendCampaign, getCampaigns, getCampaignDetail } from '@/app/actions/marketing';
import { getFeedbackList } from '@/app/actions/feedback';
import { LoyaltyTier, CampaignSegmentType } from '@prisma/client';
import { formatCurrency, toPersianDigits } from '@/shared/utils/formatters';

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  tags: string[];
  marketingOptIn: boolean;
  totalOrders: number;
  totalSpent: number;
  pointsBalance: number;
  lastVisit: Date;
  loyaltyTier: LoyaltyTier;
  referralCode: string | null;
}

type TabKey = 'customers' | 'campaigns' | 'feedback';

const TIER_LABELS: Record<LoyaltyTier, string> = {
  VIP: 'VIP',
  GOLD: 'طلایی',
  SILVER: 'نقره‌ای',
  BRONZE: 'برنزی',
  NORMAL: 'عادی',
};

const TIER_BADGE: Record<LoyaltyTier, string> = {
  VIP: 'bg-purple-100 text-purple-800 border-purple-200',
  GOLD: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  SILVER: 'bg-gray-100 text-gray-700 border-gray-300',
  BRONZE: 'bg-orange-100 text-orange-800 border-orange-200',
  NORMAL: 'bg-slate-100 text-slate-600 border-slate-200',
};

const SEGMENT_LABELS: Record<CampaignSegmentType, string> = {
  ALL: 'همه‌ی مشتریان',
  TIER: 'سطح باشگاه',
  TAG: 'برچسب',
  INACTIVE: 'مشتریان غیرفعال',
  CUSTOM: 'فهرست دستی',
};

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SENDING: 'در حال ارسال',
  SENT: 'ارسال شد',
  FAILED: 'ناموفق',
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('customers');

  // --- Customers tab state ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', phone: '' });

  // --- Customer detail drawer state ---
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: '', tags: '', marketingOptIn: true, dateOfBirth: '' });
  const [noteContent, setNoteContent] = useState('');

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    const res = await getCustomers();
    if (res.success && res.customers) {
      setCustomers(res.customers.map((c: any) => ({ ...c, lastVisit: new Date(c.lastVisit) })));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const totalCustomers = customers.length;
  const vipMembers = customers.filter((c) => c.loyaltyTier === 'VIP').length;
  const averageSpent = Math.round(customers.reduce((acc, c) => acc + c.totalSpent, 0) / (totalCustomers || 1));

  const handleSaveCustomer = async () => {
    if (!formData.fullName || !formData.phone) {
      alert('لطفاً نام و شماره تماس را وارد کنید.');
      return;
    }
    const res = await createCustomer(formData);
    if (res.success && res.customer) {
      await fetchCustomers();
      setIsModalOpen(false);
      setFormData({ fullName: '', phone: '' });
    } else {
      alert(res.error || 'خطا در ثبت مشتری');
    }
  };

  const filteredCustomers = customers.filter(
    (c) => c.fullName.includes(searchQuery) || c.phone.includes(searchQuery)
  );

  const openDetail = async (customerId: string) => {
    setDetailCustomerId(customerId);
    setIsDetailLoading(true);
    const res = await getCustomerDetail(customerId);
    if (res.success && res.customer) {
      setDetail(res.customer);
      setProfileForm({
        email: res.customer.email || '',
        tags: (res.customer.tags || []).join('، '),
        marketingOptIn: res.customer.marketingOptIn,
        dateOfBirth: res.customer.dateOfBirth ? new Date(res.customer.dateOfBirth).toISOString().slice(0, 10) : '',
      });
    } else {
      alert(res.error || 'خطا در دریافت اطلاعات مشتری');
    }
    setIsDetailLoading(false);
  };

  const closeDetail = () => {
    setDetailCustomerId(null);
    setDetail(null);
  };

  const handleSaveProfile = async () => {
    if (!detailCustomerId) return;
    const tags = profileForm.tags
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await updateCustomerProfile(detailCustomerId, {
      email: profileForm.email,
      tags,
      marketingOptIn: profileForm.marketingOptIn,
      dateOfBirth: profileForm.dateOfBirth || null,
    });
    if (res.success) {
      await openDetail(detailCustomerId);
      await fetchCustomers();
    } else {
      alert(res.error || 'خطا در ذخیره‌ی پروفایل');
    }
  };

  const handleAddNote = async () => {
    if (!detailCustomerId || !noteContent.trim()) return;
    const res = await addCustomerNote(detailCustomerId, noteContent);
    if (res.success) {
      setNoteContent('');
      await openDetail(detailCustomerId);
    } else {
      alert(res.error || 'خطا در ثبت یادداشت');
    }
  };

  // --- Campaigns tab state ---
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isCampaignsLoading, setIsCampaignsLoading] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [composerForm, setComposerForm] = useState({
    name: '',
    message: '',
    uiSegment: 'ALL' as CampaignSegmentType | 'BIRTHDAY',
    tier: 'VIP' as LoyaltyTier,
    tag: '',
    daysSinceLastVisit: 30,
  });
  const [birthdayCustomers, setBirthdayCustomers] = useState<{ id: string; fullName: string }[]>([]);
  const [segmentPreview, setSegmentPreview] = useState<{ totalInSegment: number; optedInCount: number } | null>(null);
  const [campaignDetail, setCampaignDetail] = useState<any>(null);

  const fetchCampaigns = useCallback(async () => {
    setIsCampaignsLoading(true);
    const res = await getCampaigns();
    if (res.success && res.campaigns) setCampaigns(res.campaigns);
    setIsCampaignsLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'campaigns') {
      fetchCampaigns();
      getDistinctCustomerTags().then((res) => {
        if (res.success && res.tags) setAvailableTags(res.tags);
      });
    }
  }, [activeTab, fetchCampaigns]);

  /** نوع/پارامترهای واقعیِ segment که باید به سرور فرستاده شود — «تولد نزدیک» در UI یک گزینه‌ی جداست، اما زیر پوستش از segmentType=CUSTOM (با فهرست شناسه‌های محاسبه‌شده) استفاده می‌کند. */
  const resolveActualSegment = (): { segmentType: CampaignSegmentType; segmentParams: any } => {
    if (composerForm.uiSegment === 'BIRTHDAY') {
      return { segmentType: 'CUSTOM', segmentParams: { customerIds: birthdayCustomers.map((c) => c.id) } };
    }
    if (composerForm.uiSegment === 'TIER') return { segmentType: 'TIER', segmentParams: { tier: composerForm.tier } };
    if (composerForm.uiSegment === 'TAG') return { segmentType: 'TAG', segmentParams: { tag: composerForm.tag } };
    if (composerForm.uiSegment === 'INACTIVE') {
      return { segmentType: 'INACTIVE', segmentParams: { daysSinceLastVisit: composerForm.daysSinceLastVisit } };
    }
    return { segmentType: 'ALL', segmentParams: undefined };
  };

  useEffect(() => {
    if (!isComposerOpen) return;
    if (composerForm.uiSegment === 'BIRTHDAY') {
      getUpcomingBirthdayCustomers(30).then((res) => {
        if (res.success && res.customers) setBirthdayCustomers(res.customers);
      });
      return;
    }
    const { segmentType, segmentParams } = resolveActualSegment();
    getCustomerSegmentPreview(segmentType, segmentParams).then((res) => {
      if (res.success) setSegmentPreview({ totalInSegment: res.totalInSegment!, optedInCount: res.optedInCount! });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComposerOpen, composerForm.uiSegment, composerForm.tier, composerForm.tag, composerForm.daysSinceLastVisit]);

  const handleCreateCampaign = async () => {
    if (!composerForm.name.trim() || !composerForm.message.trim()) {
      alert('نام کمپین و متن پیام الزامی است');
      return;
    }
    const { segmentType, segmentParams } = resolveActualSegment();
    if (composerForm.uiSegment === 'BIRTHDAY' && birthdayCustomers.length === 0) {
      alert('در حال حاضر هیچ مشتری‌ای با تاریخ تولد نزدیک ثبت نشده است.');
      return;
    }
    const res = await createCampaign({
      name: composerForm.name,
      message: composerForm.message,
      segmentType,
      segmentParams,
    });
    if (res.success) {
      setIsComposerOpen(false);
      setComposerForm({ name: '', message: '', uiSegment: 'ALL', tier: 'VIP', tag: '', daysSinceLastVisit: 30 });
      await fetchCampaigns();
    } else {
      alert(res.error || 'خطا در ساخت کمپین');
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    if (!confirm('این کمپین برای همه‌ی مخاطبانِ بخشِ هدف ارسال می‌شود. ادامه می‌دهید؟')) return;
    const res = await sendCampaign(campaignId);
    if (res.success) {
      await fetchCampaigns();
    } else {
      alert(res.error || 'خطا در ارسال کمپین');
    }
  };

  const openCampaignDetail = async (campaignId: string) => {
    const res = await getCampaignDetail(campaignId);
    if (res.success) setCampaignDetail(res.campaign);
    else alert(res.error || 'خطا در دریافت جزئیات کمپین');
  };

  // --- Feedback tab state ---
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'feedback') {
      setIsFeedbackLoading(true);
      getFeedbackList().then((res) => {
        if (res.success) {
          setFeedbacks(res.feedbacks || []);
          setAverageRating(res.averageRating || 0);
        }
        setIsFeedbackLoading(false);
      });
    }
  }, [activeTab]);

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">مدیریت مشتریان (CRM)</h1>
          <p className="text-gray-500 mt-1">باشگاه مشتریان، بخش‌بندی، کمپین‌های پیامکی و بازخوردها</p>
        </div>
        {activeTab === 'customers' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <span>➕</span> افزودن مشتری جدید
          </button>
        )}
        {activeTab === 'campaigns' && (
          <button
            onClick={() => setIsComposerOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <span>📣</span> کمپین جدید
          </button>
        )}
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-sm w-fit">
        {([
          ['customers', 'مشتریان'],
          ['campaigns', 'کمپین‌ها'],
          ['feedback', 'بازخوردها'],
        ] as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <span className="text-gray-500 text-sm font-semibold mb-2 block">تعداد کل مشتریان</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-blue-600">{toPersianDigits(totalCustomers)}</span>
                <span className="text-gray-400 font-medium text-sm">نفر</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <span className="text-gray-500 text-sm font-semibold mb-2 block">مشتریان ویژه (VIP)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-purple-600">{toPersianDigits(vipMembers)}</span>
                <span className="text-gray-400 font-medium text-sm">نفر</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <span className="text-gray-500 text-sm font-semibold mb-2 block">میانگین ارزش خرید</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600">{formatCurrency(averageSpent)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[400px]">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">لیست مشتریان</h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو با شماره یا نام..."
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-right font-sans w-64"
                dir="rtl"
              />
            </div>

            {isLoading && customers.length === 0 ? (
              <div className="flex justify-center items-center h-[300px]">
                <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات مشتریان...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-right">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700">مشتری</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700">شماره تماس</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">سطح وفاداری</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">برچسب‌ها</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700 text-left">مجموع خرید</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">عملیات</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-50">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold ml-3 text-lg border border-indigo-200">
                              {customer.fullName.charAt(0)}
                            </div>
                            <div className="text-sm font-bold text-gray-900">{customer.fullName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700 font-mono font-bold bg-gray-100 px-2 py-1 rounded-md">{customer.phone}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${TIER_BADGE[customer.loyaltyTier]}`}>
                            {TIER_LABELS[customer.loyaltyTier]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {(customer.tags || []).slice(0, 2).map((tag) => (
                              <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{tag}</span>
                            ))}
                            {(customer.tags || []).length === 0 && <span className="text-xs text-gray-300">—</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                          <span className="text-base font-black text-gray-900">{formatCurrency(customer.totalSpent)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => openDetail(customer.id)}
                            className="text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-2 rounded-lg transition-colors border border-indigo-200"
                          >
                            👤 جزئیات
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm font-medium">هیچ مشتری‌ای یافت نشد.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[300px]">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">کمپین‌های پیامکی</h2>
            <p className="text-sm text-gray-500 mt-1">ساخت و ارسال کمپین برای یک بخش از مشتریان (فقط مشتریانِ دارای رضایت دریافت پیامک)</p>
          </div>
          {isCampaignsLoading && campaigns.length === 0 ? (
            <div className="flex justify-center items-center h-[200px] text-gray-500 font-bold animate-pulse">درحال دریافت کمپین‌ها...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-right">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">نام کمپین</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">بخش هدف</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">وضعیت</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">گیرندگان</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/80">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{c.message.slice(0, 40)}{c.message.length > 40 ? '…' : ''}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{SEGMENT_LABELS[c.segmentType as CampaignSegmentType]}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                          {CAMPAIGN_STATUS_LABELS[c.status] || c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {c.status === 'SENT' ? `${toPersianDigits(c.sentCount)} ارسال / ${toPersianDigits(c.failedCount)} خطا` : `${toPersianDigits(c.recipientCount)} نفر`}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium flex gap-2 justify-center">
                        {c.status === 'DRAFT' && (
                          <button onClick={() => handleSendCampaign(c.id)} className="text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg transition-colors">
                            ارسال
                          </button>
                        )}
                        <button onClick={() => openCampaignDetail(c.id)} className="text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-2 rounded-lg transition-colors border border-indigo-200">
                          مشاهده
                        </button>
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm font-medium">هنوز کمپینی ساخته نشده است.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-fit">
            <span className="text-gray-500 text-sm font-semibold mb-2 block">میانگین امتیاز مشتریان</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-500">{averageRating.toFixed(1)}</span>
              <span className="text-gray-400 font-medium text-sm">از ۵ ({toPersianDigits(feedbacks.length)} بازخورد)</span>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[300px]">
            {isFeedbackLoading ? (
              <div className="flex justify-center items-center h-[200px] text-gray-500 font-bold animate-pulse">درحال دریافت بازخوردها...</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {feedbacks.map((f) => (
                  <div key={f.id} className="px-6 py-4 flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{f.customer.fullName} <span className="text-gray-400 font-normal">— سفارش {f.order.orderNumber}</span></div>
                      {f.comment && <p className="text-sm text-gray-600 mt-1">{f.comment}</p>}
                    </div>
                    <span className="text-amber-500 font-bold text-sm whitespace-nowrap">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                  </div>
                ))}
                {feedbacks.length === 0 && (
                  <div className="px-6 py-10 text-center text-gray-500 text-sm font-medium">هنوز بازخوردی ثبت نشده است.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><span>➕</span> تعریف مشتری جدید</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-indigo-400 hover:text-indigo-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام و نام خانوادگی <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="مثال: علی رضایی"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">شماره تماس (موبایل) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-left font-mono"
                  dir="ltr"
                  placeholder="09123456789"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">انصراف</button>
              <button onClick={handleSaveCustomer} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">ثبت مشتری</button>
            </div>
          </div>
        </div>
      )}

      {detailCustomerId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-indigo-900">پروفایل مشتری{detail ? `: ${detail.fullName}` : ''}</h2>
              <button onClick={closeDetail} className="text-indigo-400 hover:text-indigo-700 text-2xl leading-none">&times;</button>
            </div>

            {isDetailLoading || !detail ? (
              <div className="flex justify-center items-center h-[300px] text-gray-500 font-bold animate-pulse">درحال بارگذاری...</div>
            ) : (
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">ایمیل</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      dir="ltr"
                      placeholder="example@mail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">تاریخ تولد</label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">برچسب‌ها (با ویرگول جدا کنید)</label>
                  <input
                    type="text"
                    value={profileForm.tags}
                    onChange={(e) => setProfileForm({ ...profileForm, tags: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="مثال: گیاه‌خوار، تولد نزدیک"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={profileForm.marketingOptIn}
                    onChange={(e) => setProfileForm({ ...profileForm, marketingOptIn: e.target.checked })}
                    className="w-4 h-4"
                  />
                  اجازه‌ی دریافت پیامک بازاریابی/کمپین
                </label>

                <button onClick={handleSaveProfile} className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg">
                  ذخیره‌ی پروفایل
                </button>

                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-2">برنامه‌ی معرفی</h3>
                  <p className="text-sm text-gray-600">
                    کد معرفی: <span className="font-mono font-bold bg-gray-100 px-2 py-0.5 rounded">{detail.referralCode || '—'}</span>
                  </p>
                  {detail.referredByCustomer && (
                    <p className="text-sm text-gray-600 mt-1">معرفی‌شده توسط: {detail.referredByCustomer.fullName} ({detail.referredByCustomer.phone})</p>
                  )}
                  {detail.referredCustomers?.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {toPersianDigits(detail.referredCustomers.length)} نفر معرفی کرده — {toPersianDigits(detail.referredCustomers.filter((r: any) => r.referralRewardGranted).length)} نفر پاداش‌دار
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-2">یادداشت‌های داخلی</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                    {(detail.notes || []).map((n: any) => (
                      <div key={n.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                        <p className="text-gray-700">{n.content}</p>
                        <p className="text-xs text-gray-400 mt-1">{n.author?.name} — {formatDate(new Date(n.createdAt))}</p>
                      </div>
                    ))}
                    {(detail.notes || []).length === 0 && <p className="text-sm text-gray-400">یادداشتی ثبت نشده است.</p>}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      placeholder="یادداشت جدید..."
                    />
                    <button onClick={handleAddNote} className="text-sm font-bold text-white bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded-lg">افزودن</button>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-2">بازخوردهای این مشتری</h3>
                  {(detail.feedbacks || []).length === 0 && <p className="text-sm text-gray-400">بازخوردی ثبت نشده است.</p>}
                  {(detail.feedbacks || []).map((f: any) => (
                    <div key={f.id} className="text-sm text-gray-700 mb-1">
                      <span className="text-amber-500 font-bold">{'★'.repeat(f.rating)}</span> — سفارش {f.order?.orderNumber} {f.comment && `— ${f.comment}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isComposerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><span>📣</span> کمپین جدید</h2>
              <button onClick={() => setIsComposerOpen(false)} className="text-indigo-400 hover:text-indigo-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام کمپین</label>
                <input
                  type="text"
                  value={composerForm.name}
                  onChange={(e) => setComposerForm({ ...composerForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500"
                  placeholder="مثال: تخفیف پاییزی"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">متن پیام</label>
                <textarea
                  value={composerForm.message}
                  onChange={(e) => setComposerForm({ ...composerForm, message: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500"
                  placeholder="متن پیامکی که برای مشتریان ارسال می‌شود..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">بخش هدف</label>
                <select
                  value={composerForm.uiSegment}
                  onChange={(e) => setComposerForm({ ...composerForm, uiSegment: e.target.value as CampaignSegmentType | 'BIRTHDAY' })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="ALL">همه‌ی مشتریان</option>
                  <option value="TIER">سطح باشگاه</option>
                  <option value="TAG">برچسب</option>
                  <option value="INACTIVE">مشتریان غیرفعال (win-back)</option>
                  <option value="BIRTHDAY">تولد نزدیک (۳۰ روز آینده)</option>
                </select>
              </div>

              {composerForm.uiSegment === 'TIER' && (
                <select
                  value={composerForm.tier}
                  onChange={(e) => setComposerForm({ ...composerForm, tier: e.target.value as LoyaltyTier })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500"
                >
                  {Object.entries(TIER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              )}

              {composerForm.uiSegment === 'TAG' && (
                <select
                  value={composerForm.tag}
                  onChange={(e) => setComposerForm({ ...composerForm, tag: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">— انتخاب برچسب —</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              )}

              {composerForm.uiSegment === 'INACTIVE' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">بدون مراجعه از (روز)</label>
                  <input
                    type="number"
                    value={composerForm.daysSinceLastVisit}
                    onChange={(e) => setComposerForm({ ...composerForm, daysSinceLastVisit: parseInt(e.target.value) || 30 })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 text-left"
                    dir="ltr"
                  />
                </div>
              )}

              {composerForm.uiSegment === 'BIRTHDAY' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 font-bold">
                  {toPersianDigits(birthdayCustomers.length)} مشتری در ۳۰ روز آینده تولد دارند
                </div>
              )}

              {segmentPreview && composerForm.uiSegment !== 'BIRTHDAY' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 font-bold">
                  {toPersianDigits(segmentPreview.totalInSegment)} نفر در این بخش — {toPersianDigits(segmentPreview.optedInCount)} نفر پیامک دریافت می‌کنند
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
              <button onClick={() => setIsComposerOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">انصراف</button>
              <button onClick={handleCreateCampaign} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">ذخیره‌ی پیش‌نویس</button>
            </div>
          </div>
        </div>
      )}

      {campaignDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-indigo-900">{campaignDetail.name}</h2>
              <button onClick={() => setCampaignDetail(null)} className="text-indigo-400 hover:text-indigo-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
              <p className="text-sm text-gray-600">{campaignDetail.message}</p>
              <div className="divide-y divide-gray-50 border-t border-gray-100 pt-2">
                {campaignDetail.recipients.map((r: any) => (
                  <div key={r.id} className="py-2 flex justify-between text-sm">
                    <span className="text-gray-700">{r.customer.fullName} ({r.customer.phone})</span>
                    <span className={r.status === 'SENT' ? 'text-emerald-600 font-bold' : r.status === 'FAILED' ? 'text-red-600 font-bold' : 'text-gray-400'}>
                      {r.status === 'SENT' ? 'ارسال شد' : r.status === 'FAILED' ? 'ناموفق' : 'در انتظار'}
                    </span>
                  </div>
                ))}
                {campaignDetail.recipients.length === 0 && <p className="text-sm text-gray-400 py-4">هنوز ارسال نشده است.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
