'use client';
import dynamic from 'next/dynamic';

const MongoBlocksApp = dynamic(() => import('@/components/MongoBlocksApp'), { ssr: false });

export default function Page() {
  return <MongoBlocksApp />;
}
