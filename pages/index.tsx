import dynamic from 'next/dynamic';
import Head from 'next/head';

const ThreeScene = dynamic(() => import('../components/ThreeScene'), { ssr: false });

export default function Home(): JSX.Element {
  return (
    <>
      <Head>
        <title>Three.js + Next + TypeScript</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main>
        <ThreeScene />
      </main>
    </>
  );
}
