import dynamic from 'next/dynamic';
import Head from 'next/head';

const ThreeScene = dynamic(() => import('../components/ThreeScene'), { ssr: false });

export default function Home(): JSX.Element {
  return (
    <>
      <Head>
        <title>Rose Run Slalom</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Ski a first-person three-dimensional slalom course and burst pixel roses through every gate."
        />
      </Head>
      <main>
        <ThreeScene />
      </main>
    </>
  );
}
