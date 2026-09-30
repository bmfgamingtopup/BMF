delete from public.revenue_stats
where (label, value, sort_order) in (
  ('Recharges', '24K+', 1),
  ('Clients actifs', '8.4K', 2),
  ('Cartes vendues', '3.1K', 3),
  ('Temps moyen', '42s', 4)
);

delete from public.top_up_packs
where (tag, name, diamonds, price) in (
  ('START', 'Starter Pack', '500', '2 500 FCFA'),
  ('VIP', 'Elite Pack', '2000', '8 500 FCFA'),
  ('PRO', 'Pro Pack', '5000', '19 500 FCFA'),
  ('MAX', 'Legend Pack', '12000', '41 500 FCFA')
);

delete from public.gift_cards
where (type, name, value) in (
  ('DIGITAL', 'Carte 5K', '5 000 FCFA'),
  ('DIGITAL', 'Carte 10K', '10 000 FCFA'),
  ('DIGITAL', 'Carte 25K', '25 000 FCFA'),
  ('DIGITAL', 'Carte 50K', '50 000 FCFA')
);

delete from public.ai_events
where (title, summary, reward) in (
  ('BMF premium update', 'La marketplace BMF met en avant de nouveaux packs premium pour les joueurs actifs.', '5 000 FCFA'),
  ('Flash recharge weekend', 'Les offres de recharge sont boostées pour améliorer la conversion et l’expérience client.', '2 500 FCFA'),
  ('Cartes cadeaux populaires', 'Les cartes les plus demandées sont désormais mises en avant dans le catalogue digital.', '3 000 FCFA')
);
