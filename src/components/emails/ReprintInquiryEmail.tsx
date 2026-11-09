import { Fragment } from 'react';
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from 'react-email';
import type { Locale } from '@/lib/i18n/config';

export interface ReprintInquiryEmailProps {
  name: string;
  email: string;
  message: string;
  artworkId: string;
  artworkTitleIs: string;
  artworkTitleEn: string;
  artworkYear: number | null;
  artworkImageUrl: string;
  artworkUrl: string;
  submittedLocale: Locale;
  submittedAt: string; // ISO 8601
}

// Hex equivalents of the site tokens (mail clients do not support oklch / CSS variables).
const c = {
  canvas: '#f7f7f7',
  surface: '#ffffff',
  ink: '#141414',
  muted: '#5e5e5e',
  subtle: '#8a8a8a',
  rule: '#e4e4e4',
};
const serif = "'EB Garamond', Georgia, 'Times New Roman', serif";
const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const s = {
  body: { backgroundColor: c.canvas, margin: 0, padding: '32px 0', fontFamily: sans, color: c.ink },
  container: {
    backgroundColor: c.surface,
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 32px',
    border: `1px solid ${c.rule}`,
  },
  eyebrow: {
    fontSize: '11px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: c.subtle,
    margin: '0 0 12px',
  },
  h1: { fontFamily: serif, fontSize: '30px', lineHeight: '1.15', fontWeight: 400, margin: '0' },
  subtitle: { fontSize: '14px', color: c.muted, margin: '6px 0 24px' },
  image: { display: 'block', width: '100%', height: 'auto', border: `1px solid ${c.rule}` },
  hr: { borderColor: c.rule, margin: '28px 0' },
  label: {
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: c.subtle,
    margin: '0',
    width: '140px',
    verticalAlign: 'top' as const,
    paddingBottom: '10px',
  },
  value: { fontSize: '15px', color: c.ink, margin: '0', paddingBottom: '10px' },
  message: { fontSize: '15px', lineHeight: '1.65', color: c.ink, margin: '8px 0 0' },
  footer: { fontSize: '12px', lineHeight: '1.6', color: c.muted, margin: '0' },
  link: { color: c.ink, textDecoration: 'underline' },
};

export function ReprintInquiryEmail(p: ReprintInquiryEmailProps) {
  const submitted = new Intl.DateTimeFormat('is-IS', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Atlantic/Reykjavik',
  }).format(new Date(p.submittedAt));
  const lines = p.message.split(/\r?\n/);

  const rows: Array<[string, React.ReactNode]> = [
    ['Nafn · Name', p.name],
    [
      'Netfang · Email',
      <Link key="e" href={`mailto:${p.email}`} style={s.link}>
        {p.email}
      </Link>,
    ],
    ['Tungumál · Language', p.submittedLocale === 'is' ? 'Íslenska' : 'English'],
    ['Sent · Submitted', submitted],
  ];

  return (
    <Html lang="is">
      <Head />
      <Preview>{`Eftirprent: ${p.artworkTitleIs} — ${p.name}`}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Text style={s.eyebrow}>Fyrirspurn um eftirprent · Reprint inquiry</Text>
          <Heading as="h1" style={s.h1}>
            {p.artworkTitleIs}
          </Heading>
          <Text style={s.subtitle}>
            {p.artworkTitleEn}
            {p.artworkYear ? ` · ${p.artworkYear}` : ''} · {p.artworkId}
          </Text>

          <Section>
            <Link href={p.artworkUrl}>
              <Img src={p.artworkImageUrl} alt={p.artworkTitleIs} width="536" style={s.image} />
            </Link>
          </Section>

          <Hr style={s.hr} />

          <Section>
            {rows.map(([label, value]) => (
              <Row key={label}>
                <Column style={s.label}>{label}</Column>
                <Column style={s.value}>{value}</Column>
              </Row>
            ))}
          </Section>

          <Hr style={s.hr} />

          <Text style={s.eyebrow}>Skilaboð · Message</Text>
          <Text style={s.message}>
            {lines.map((line, i) => (
              <Fragment key={i}>
                {line}
                {i < lines.length - 1 && <br />}
              </Fragment>
            ))}
          </Text>

          <Hr style={s.hr} />

          <Text style={s.footer}>
            Svaraðu þessum pósti til að svara {p.name} beint. · Reply to this email to respond to{' '}
            {p.name} directly.
            <br />
            <Link href={p.artworkUrl} style={s.link}>
              Skoða verkið á vefnum · View the work online
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

ReprintInquiryEmail.PreviewProps = {
  name: 'Guðrún Jónsdóttir',
  email: 'gudrun@example.is',
  message: 'Góðan daginn,\nÉg hef áhuga á eftirprenti í stærð A3.\nKveðja, Guðrún',
  artworkId: 'ART-0001',
  artworkTitleIs: 'Hraun við sjó',
  artworkTitleEn: 'Lava by the Sea',
  artworkYear: 1978,
  artworkImageUrl: 'https://placehold.co/1072x758/jpg',
  artworkUrl: 'https://brynja-arnadottir.vercel.app/is/works/hraun-vid-sjo',
  submittedLocale: 'is',
  submittedAt: '2026-11-08T12:00:00.000Z',
} satisfies ReprintInquiryEmailProps;

export default ReprintInquiryEmail;
