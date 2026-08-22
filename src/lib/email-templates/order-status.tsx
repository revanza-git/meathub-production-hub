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

export interface OrderStatusEmailProps {
  heading?: string
  body?: string
  buyerName?: string
  orderNo?: string
  totalText?: string
  trackUrl?: string
  items?: Array<{ name: string; qty: string; amount: string }>
}

const CRIMSON = '#8a1c26'

export function OrderStatusEmail({
  heading = 'Update pesanan Anda',
  body = 'Ada pembaruan pada pesanan Meatlink Anda.',
  buyerName = 'Pelanggan',
  orderNo = 'ML-000000',
  totalText = 'Rp0',
  trackUrl = 'https://meatlink.id',
  items = [],
}: OrderStatusEmailProps) {
  return (
    <Html lang="id">
      <Head />
      <Preview>{`${heading} — pesanan ${orderNo}`}</Preview>
      <Body style={{ margin: 0, background: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#1a1a1a' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '28px 24px' }}>
          <Text style={{ margin: '0 0 20px', fontSize: '12px', letterSpacing: '.18em', textTransform: 'uppercase', color: CRIMSON, fontWeight: 700 }}>
            Meatlink
          </Text>
          <Heading as="h1" style={{ margin: '0 0 8px', fontSize: '22px' }}>{heading}</Heading>
          <Text style={{ margin: '0 0 4px', color: '#444' }}>Halo {buyerName},</Text>
          <Text style={{ margin: '0 0 20px', color: '#444' }}>{body}</Text>

          <Text style={{ margin: '0 0 4px', fontSize: '13px', color: '#666' }}>No. pesanan</Text>
          <Text style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700 }}>{orderNo}</Text>

          <Section>
            {items.map((item, index) => (
              <Text
                key={`${item.name}-${index}`}
                style={{ margin: 0, padding: '6px 0', borderBottom: '1px solid #eee', fontSize: '14px' }}
              >
                {item.name} — {item.qty} kg · {item.amount}
              </Text>
            ))}
          </Section>

          <Hr style={{ borderColor: '#eee', margin: '12px 0' }} />
          <Text style={{ margin: '0 0 20px', fontSize: '15px' }}>
            <strong>Total: {totalText}</strong>
          </Text>

          <Link
            href={trackUrl}
            style={{
              background: CRIMSON,
              color: '#ffffff',
              textDecoration: 'none',
              padding: '12px 22px',
              display: 'inline-block',
              fontSize: '13px',
              letterSpacing: '.1em',
              textTransform: 'uppercase',
            }}
          >
            Lacak pesanan
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
  component: OrderStatusEmail,
  displayName: 'Update pesanan',
  subject: (data: Record<string, any>) =>
    (data?.['subject'] as string) || `Update pesanan ${data?.['orderNo'] ?? ''} — Meatlink`,
  previewData: {
    subject: 'Pesanan ML-250822-0001 diterima — Meatlink',
    heading: 'Pesanan Anda sudah kami terima',
    body: 'Terima kasih. Pesanan Anda sedang menunggu pembayaran / konfirmasi tim kami.',
    buyerName: 'Budi Santoso',
    orderNo: 'ML-250822-0001',
    totalText: 'Rp4.250.000',
    trackUrl: 'https://meatlink.id/pesanan/ML-250822-0001',
    items: [
      { name: 'Wagyu Ribeye A5', qty: '5', amount: 'Rp3.500.000' },
      { name: 'Short Plate US', qty: '10', amount: 'Rp750.000' },
    ],
  },
} satisfies TemplateEntry
