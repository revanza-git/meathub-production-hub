import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface OpsAlertEmailProps {
  heading?: string
  intro?: string
  stats?: Array<{ label: string; value: string }>
  listTitle?: string
  list?: Array<{ label: string; value: string }>
  ctaUrl?: string
  ctaLabel?: string
}

const CRIMSON = '#8a1c26'

export function OpsAlertEmail({
  heading = 'Ringkasan operasional Meatlink',
  intro = 'Ringkasan otomatis dari sistem Meatlink.',
  stats = [],
  listTitle = '',
  list = [],
  ctaUrl = 'https://meatlink.id/admin',
  ctaLabel = 'Buka admin',
}: OpsAlertEmailProps) {
  return (
    <Html lang="id">
      <Head />
      <Preview>{heading}</Preview>
      <Body style={{ margin: 0, background: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#1a1a1a' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '28px 24px' }}>
          <Text style={{ margin: '0 0 20px', fontSize: '12px', letterSpacing: '.18em', textTransform: 'uppercase', color: CRIMSON, fontWeight: 700 }}>
            Meatlink · Ops
          </Text>
          <Heading as="h1" style={{ margin: '0 0 8px', fontSize: '22px' }}>{heading}</Heading>
          <Text style={{ margin: '0 0 20px', color: '#444' }}>{intro}</Text>

          <Section>
            {stats.map((stat, index) => (
              <Text
                key={`${stat.label}-${index}`}
                style={{ margin: 0, padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '14px' }}
              >
                <span style={{ color: '#666' }}>{stat.label}</span>
                {'  '}
                <strong style={{ float: 'right' }}>{stat.value}</strong>
              </Text>
            ))}
          </Section>

          {list.length > 0 ? (
            <Section style={{ marginTop: '24px' }}>
              <Text style={{ margin: '0 0 6px', fontSize: '13px', letterSpacing: '.14em', textTransform: 'uppercase', color: '#666' }}>
                {listTitle}
              </Text>
              {list.map((item, index) => (
                <Text
                  key={`${item.label}-${index}`}
                  style={{ margin: 0, padding: '6px 0', borderBottom: '1px solid #eee', fontSize: '14px' }}
                >
                  {item.label} — {item.value}
                </Text>
              ))}
            </Section>
          ) : null}

          <Hr style={{ margin: '24px 0', borderColor: '#eee' }} />

          <Link
            href={ctaUrl}
            style={{
              display: 'inline-block',
              background: CRIMSON,
              color: '#ffffff',
              padding: '12px 22px',
              fontSize: '13px',
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            {ctaLabel}
          </Link>

          <Text style={{ margin: '24px 0 0', fontSize: '12px', color: '#888' }}>
            Email otomatis dari Meatlink.id
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OpsAlertEmail,
  displayName: 'Ops alert',
  subject: (data: Record<string, any>) =>
    (data?.['subject'] as string) || 'Ringkasan operasional Meatlink',
  previewData: {
    subject: 'Ringkasan harian Meatlink — 22 Agustus 2026',
    heading: 'Ringkasan harian Meatlink',
    intro: 'Aktivitas toko untuk 22 Agustus 2026.',
    stats: [
      { label: 'Pesanan masuk', value: '12' },
      { label: 'Omzet', value: 'Rp84.500.000' },
      { label: 'Menunggu pembayaran', value: '3' },
    ],
    listTitle: 'Stok menipis',
    list: [{ label: 'Wagyu Ribeye A5', value: '4 kg' }],
    ctaUrl: 'https://meatlink.id/admin',
    ctaLabel: 'Buka admin',
  },
} satisfies TemplateEntry
