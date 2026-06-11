CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),

    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    file_name text,
    processed_count integer,
    skipped_count integer,
    errors jsonb,
    vendors jsonb,
    total_savings numeric,
    user_id uuid,
    status text DEFAULT 'processing' NOT NULL,
    file_path text,

    CONSTRAINT reports_pkey PRIMARY KEY (id),

    CONSTRAINT reports_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
);

CREATE TABLE public.report_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    event_type text NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now(),

    CONSTRAINT report_events_pkey PRIMARY KEY (id),

    CONSTRAINT report_events_report_id_fkey
      FOREIGN KEY (report_id)
      REFERENCES public.reports(id)
      ON DELETE CASCADE
);

CREATE INDEX idx_users_email
ON public.users(email);

CREATE INDEX idx_reports_user_id
ON public.reports(user_id);

CREATE INDEX idx_report_events_report_id
ON public.report_events(report_id);