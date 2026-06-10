'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { MessageSquare, RefreshCw, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsPanel() {
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

  useEffect(() => {
    fetchConfig();
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
              <label className="text-sm font-medium text-slate-300">Discord Bot Token</label>
              <Input
                type="password"
                placeholder="กรอก Discord Bot Token..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                disabled={loading}
              />
              <p className="text-xs text-slate-500">
                Token สำหรับสั่งให้ Bot อัปโหลด/ดาวน์โหลดและลบข้อความย่อยใน Server
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Discord Channel ID</label>
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
      </Card>
    </div>
  );
}
