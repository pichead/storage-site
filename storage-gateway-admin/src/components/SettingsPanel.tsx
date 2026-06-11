'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { MessageSquare, RefreshCw, Save, CheckCircle2, AlertCircle, Trash2, Plus, Layers, Bot } from 'lucide-react';

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<'general' | 'pool'>('general');
  
  // General Config States
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [twitterCookies, setTwitterCookies] = useState('');
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error' | null; message: string }>({
    status: null,
    message: '',
  });

  // Bot Pool States
  const [poolAccounts, setPoolAccounts] = useState<any[]>([]);
  const [poolBotToken, setPoolBotToken] = useState('');
  const [poolChannelId, setPoolChannelId] = useState('');
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolAddLoading, setPoolAddLoading] = useState(false);
  const [poolError, setPoolError] = useState('');
  const [poolSuccess, setPoolSuccess] = useState('');

  // โหลดการตั้งค่าที่มีอยู่จาก API
  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/discord/config');
      const resData = response.data;
      if (resData.statusCode === 200 && resData.data) {
        setBotToken(resData.data.botToken || '');
        setChannelId(resData.data.channelId || '');
        setTwitterCookies(resData.data.twitterCookies || '');
      }
    } catch (err: any) {
      setError('ไม่สามารถโหลดข้อมูลการตั้งค่า Discord ได้');
    } finally {
      setLoading(false);
    }
  };

  // โหลดสระบอทจาก API
  const fetchPool = async () => {
    setPoolLoading(true);
    setPoolError('');
    try {
      const response = await api.get('/discord/pool');
      const resData = response.data;
      if (resData.statusCode === 200) {
        setPoolAccounts(resData.data || []);
      }
    } catch (err: any) {
      setPoolError('ไม่สามารถโหลดข้อมูลสระบอทได้');
    } finally {
      setPoolLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchPool();
  }, []);

  const handleTestConnection = async () => {
    if (!botToken || !channelId) {
      setTestResult({ status: 'error', message: 'กรุณากรอก Bot Token และ Channel ID ให้ครบก่อนทดสอบ' });
      return;
    }
    setTestLoading(true);
    setTestResult({ status: null, message: '' });
    try {
      const response = await api.post('/discord/test-connection', { botToken, channelId });
      const resData = response.data;
      if (resData.statusCode === 200) {
        setTestResult({ status: 'success', message: 'เชื่อมต่อไปยัง Discord สำเร็จ!' });
      } else {
        setTestResult({ status: 'error', message: resData.messageTh || 'เชื่อมต่อไปยัง Discord ล้มเหลว' });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: err.response?.data?.messageTh || err.response?.data?.messageEn || 'การเชื่อมต่อผิดพลาด ลิงก์บอทอาจไม่ถูกต้อง',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botToken || !channelId) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setTestResult({ status: null, message: '' });

    try {
      const response = await api.post('/discord/config', { botToken, channelId, twitterCookies });
      const resData = response.data;
      if (resData.statusCode === 200) {
        setSuccess('บันทึกการตั้งค่า Discord เรียบร้อยแล้ว!');
        fetchConfig(); // ดึงการตั้งค่าแบบสวม Masking มาใหม่
      } else {
        setError(resData.messageTh || 'ไม่สามารถบันทึกข้อมูลตั้งค่าได้');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.messageTh || 
        err.response?.data?.messageEn || 
        'เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อบันทึกข้อมูล'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddPoolAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolBotToken || !poolChannelId) {
      setPoolError('กรุณากรอก Bot Token และ Channel ID ให้ครบถ้วน');
      return;
    }

    setPoolAddLoading(true);
    setPoolError('');
    setPoolSuccess('');

    try {
      const response = await api.post('/discord/pool', {
        botToken: poolBotToken,
        channelId: poolChannelId,
      });
      const resData = response.data;
      if (resData.statusCode === 200) {
        setPoolSuccess('เพิ่มบัญชีบอทเข้าใน Pool สำเร็จ!');
        setPoolBotToken('');
        setPoolChannelId('');
        fetchPool();
      } else {
        setPoolError(resData.messageTh || 'เพิ่มบอทล้มเหลว');
      }
    } catch (err: any) {
      setPoolError(
        err.response?.data?.messageTh || 
        err.response?.data?.messageEn || 
        'ไม่สามารถเพิ่มบอทเข้าระบบได้ บอทอาจไม่สามารถเข้าห้องดังกล่าวได้'
      );
    } finally {
      setPoolAddLoading(false);
    }
  };

  const handleDeletePoolAccount = async (id: string) => {
    if (!confirm('คุณต้องการลบสัญญานบอทนี้ออกจาก Pool ใช่หรือไม่?')) {
      return;
    }

    setPoolLoading(true);
    setPoolError('');
    setPoolSuccess('');

    try {
      const response = await api.delete(`/discord/pool/${id}`);
      const resData = response.data;
      if (resData.statusCode === 200) {
        setPoolSuccess('ลบบัญชีออกจาก Pool สำเร็จ');
        fetchPool();
      } else {
        setPoolError(resData.messageTh || 'ลบบัญชีล้มเหลว');
      }
    } catch (err: any) {
      setPoolError('เกิดข้อผิดพลาดในการสั่งลบบัญชี');
    } finally {
      setPoolLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6 font-sans">
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-bold text-white">ตั้งค่าการเชื่อมต่อ Discord Storage</CardTitle>
          <CardDescription className="text-slate-400">
            ระบุรายละเอียด Token ของ Bot และ ID ห้องเพื่อใช้เป็นไดรฟ์จัดเก็บข้อมูล
          </CardDescription>
        </CardHeader>

        {/* Tab Selection */}
        <div className="px-6">
          <div className="flex border-b border-slate-800 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
                activeTab === 'general'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              ตั้งค่าหลัก (General Settings)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pool')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
                activeTab === 'pool'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              สระบัญชีบอท (Bot/Channel Pool)
            </button>
          </div>
        </div>

        {activeTab === 'general' ? (
          <form onSubmit={handleSave}>
            <CardContent className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Discord Bot Token (บัญชีหลัก)</label>
                <Input
                  type="password"
                  placeholder="กรอก Discord Bot Token..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  Token สำหรับสั่งให้ Bot อัปโหลด/ดาวน์โหลดและลบข้อความย่อยใน Server (เป็นบัญชีเริ่มต้นอัปโหลด)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Discord Channel ID (ช่องเริ่มต้น)</label>
                <Input
                  type="text"
                  placeholder="กรอกหมายเลขไอดีห้อง (Channel ID)..."
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  ID ของ Text Channel ในเซิร์ฟเวอร์ดิสคอร์ดของคุณ
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800/60">
                <label className="text-sm font-medium text-slate-300">X.com / Twitter Cookies</label>
                <textarea
                  placeholder="วางคุกกี้รูปแบบ Netscape (.txt) ที่ล็อกอินบัญชี X.com ไว้แล้ว..."
                  value={twitterCookies}
                  onChange={(e) => setTwitterCookies(e.target.value)}
                  rows={6}
                  className="w-full rounded-md bg-slate-950/40 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  คุกกี้รูปแบบ Netscape (.txt) สำหรับใช้ดาวน์โหลดวิดีโอจาก x.com ที่ถูกจำกัดอายุหรือเป็นเนื้อหา 18+ (สามารถส่งออกโดยใช้ส่วนขยายเบราว์เซอร์ เช่น {"\"Get cookies.txt LOCALLY\""} บน Chrome/Firefox แล้วนำมาคัดลอกวางทั้งหมดได้ทันที)
                </p>
              </div>

              {/* ส่วนแสดงผลและปุ่มทดสอบการเชื่อมต่อ */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">ทดสอบการสื่อสารบอท</h4>
                    <p className="text-xs text-slate-500">จำลองยิง Request เช็คความพร้อมของเซิร์ฟเวอร์ดิสคอร์ด</p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testLoading || loading}
                    variant="secondary"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  >
                    {testLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        กำลังทดสอบ...
                      </>
                    ) : (
                      'ทดสอบการเชื่อมต่อ'
                    )}
                  </Button>
                </div>

                {testResult.status && (
                  <div className={`mt-3 flex items-center gap-2 rounded-md p-2.5 text-xs border ${
                    testResult.status === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {testResult.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    {testResult.message}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="border-t border-slate-800/60 pt-4 justify-end">
              <Button
                type="submit"
                disabled={loading || testLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg hover:shadow-indigo-500/20 transition-all duration-200"
              >
                <Save className="mr-2 h-4 w-4" />
                บันทึกการตั้งค่า
              </Button>
            </CardFooter>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Add Bot to Pool Form */}
            <form onSubmit={handleAddPoolAccount}>
              <CardContent className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-indigo-400" />
                  เพิ่มบอท/ห้องจัดเก็บเข้า Pool (สลับกระจายโหลด)
                </h3>
                
                {poolError && (
                  <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {poolError}
                  </div>
                )}

                {poolSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {poolSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Discord Bot Token</label>
                    <Input
                      type="password"
                      placeholder="กรอก Bot Token สำรอง..."
                      value={poolBotToken}
                      onChange={(e) => setPoolBotToken(e.target.value)}
                      className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                      disabled={poolAddLoading || poolLoading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Discord Channel ID</label>
                    <Input
                      type="text"
                      placeholder="กรอก Channel ID สำรอง..."
                      value={poolChannelId}
                      onChange={(e) => setPoolChannelId(e.target.value)}
                      className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                      disabled={poolAddLoading || poolLoading}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={poolAddLoading || poolLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 h-9"
                  >
                    {poolAddLoading ? (
                      <>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        กำลังตรวจสอบและเพิ่ม...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        เพิ่มบอทเข้าระบบ Pool
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>

            {/* List of Bot Accounts in Pool */}
            <CardContent className="space-y-4 pt-4 border-t border-slate-800/60">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-400" />
                รายการบอทสำรองทั้งหมด ({poolAccounts.length})
              </h3>

              {poolLoading && poolAccounts.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  กำลังโหลดข้อมูล...
                </div>
              ) : poolAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center">
                  <Bot className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500">ไม่มีบอทสำรองในสระข้อมูลระบบ</p>
                  <p className="text-xs text-slate-600 mt-1">
                    บอทสำรองจะถูกเลือกหมุนเวียนแบบ Round Robin เพื่อช่วยอัปโหลดไม่ให้ติด Rate Limit 429
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/20">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Channel ID</th>
                          <th className="px-4 py-3">Bot Token (Masked)</th>
                          <th className="px-4 py-3">สถานะ</th>
                          <th className="px-4 py-3 text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {poolAccounts.map((account) => (
                          <tr key={account.id} className="hover:bg-slate-800/10">
                            <td className="px-4 py-3.5 font-mono">{account.channelId}</td>
                            <td className="px-4 py-3.5 font-mono text-slate-500">{account.botToken}</td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" />
                                Active
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleDeletePoolAccount(account.id)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
            <div className="pb-6" />
          </div>
        )}
      </Card>
    </div>
  );
}
