'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { ShieldCheck, User, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ตรวจสอบสถานะการเข้าสู่ระบบเบื้องต้น
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('กรุณากรอก Username และ Password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        username,
        password,
      });

      const resData = response.data;
      if (resData.statusCode === 200) {
        // บันทึก JWT ลงใน LocalStorage
        localStorage.setItem('accessToken', resData.data.accessToken);
        localStorage.setItem('refreshToken', resData.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(resData.data.user));

        router.push('/');
        router.refresh();
      } else {
        setError(resData.messageTh || 'การเข้าสู่ระบบล้มเหลว');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.messageTh || 
        err.response?.data?.messageEn || 
        'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์หลังบ้านได้'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-4 font-sans text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />

      <Card className="relative w-full max-w-md border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl transition-all duration-300">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">เข้าสู่ระบบบอร์ดควบคุม</CardTitle>
          <CardDescription className="text-slate-400">
            ลงชื่อเข้าใช้ระบบคลาวด์เพื่อเริ่มต้นการอัปโหลดไฟล์ไปที่ Discord
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400 animate-in fade-in zoom-in duration-200">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="h-4 w-4" />
                </span>
                <Input
                  type="text"
                  placeholder="กรอกชื่อผู้ใช้งาน..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type="password"
                  placeholder="กรอกรหัสผ่าน..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg hover:shadow-indigo-500/20 transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลงชื่อเข้าใช้งาน...
                </>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </Button>
            
            <div className="text-center text-sm text-slate-400">
              ยังไม่มีบัญชีใช้งาน?{' '}
              <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                สมัครสมาชิกที่นี่
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
