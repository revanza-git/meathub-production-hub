CREATE TABLE public.support_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES public.profiles(id), customer_name text NOT NULL, customer_email text NOT NULL, guest_token_hash text, context_label text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','closed')), last_message text NOT NULL DEFAULT '', last_message_at timestamptz NOT NULL DEFAULT now(), customer_unread integer NOT NULL DEFAULT 0, admin_unread integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_conversations_read ON public.support_conversations FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()) OR (SELECT public.ml_has_role((SELECT auth.uid()),'admin')));
CREATE TABLE public.support_messages (
 id uuid PRIMARY KEY, conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE, sender_kind text NOT NULL CHECK(sender_kind IN ('customer','admin')), sender_id uuid REFERENCES public.profiles(id), sender_name text NOT NULL, body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_messages_read ON public.support_messages FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.support_conversations c WHERE c.id=conversation_id AND (c.user_id=(SELECT auth.uid()) OR (SELECT public.ml_has_role((SELECT auth.uid()),'admin')))));
CREATE INDEX support_messages_conversation_time ON public.support_messages(conversation_id,created_at);
CREATE INDEX support_conversations_user ON public.support_conversations(user_id);
CREATE INDEX support_conversations_email ON public.support_conversations(lower(customer_email));
CREATE TABLE public.support_rate_limits (key_hash text PRIMARY KEY, window_start timestamptz NOT NULL DEFAULT now(), hits integer NOT NULL DEFAULT 1);
GRANT ALL ON public.support_rate_limits TO service_role;
ALTER TABLE public.support_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.support_consume_limit(_key text,_max integer,_seconds integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
 INSERT INTO public.support_rate_limits(key_hash) VALUES(_key) ON CONFLICT(key_hash) DO UPDATE SET hits=CASE WHEN support_rate_limits.window_start < now()-make_interval(secs=>_seconds) THEN 1 ELSE support_rate_limits.hits+1 END, window_start=CASE WHEN support_rate_limits.window_start < now()-make_interval(secs=>_seconds) THEN now() ELSE support_rate_limits.window_start END RETURNING hits INTO n;
 RETURN n<=_max;
END $$;
REVOKE ALL ON FUNCTION public.support_consume_limit(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_consume_limit(text,integer,integer) TO service_role;
CREATE FUNCTION public.support_post_message(_conversation uuid,_id uuid,_kind text,_sender uuid,_name text,_body text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted integer;
BEGIN
 PERFORM 1 FROM public.support_conversations WHERE id=_conversation FOR UPDATE;
 INSERT INTO public.support_messages(id,conversation_id,sender_kind,sender_id,sender_name,body) VALUES(_id,_conversation,_kind,_sender,_name,btrim(_body)) ON CONFLICT(id) DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted=0 THEN RETURN false; END IF;
 UPDATE public.support_conversations SET status='active',last_message=left(btrim(_body),180),last_message_at=now(),admin_unread=CASE WHEN _kind='customer' THEN admin_unread+1 ELSE 0 END,customer_unread=CASE WHEN _kind='admin' THEN customer_unread+1 ELSE 0 END WHERE id=_conversation;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.support_post_message(uuid,uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_post_message(uuid,uuid,text,uuid,text,text) TO service_role;
CREATE TABLE public.support_recovery_tokens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,token_hash text UNIQUE NOT NULL,expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes');
GRANT ALL ON public.support_recovery_tokens TO service_role;
ALTER TABLE public.support_recovery_tokens ENABLE ROW LEVEL SECURITY;