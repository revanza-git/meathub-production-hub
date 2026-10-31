CREATE TABLE public.support_chat_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
 message_id uuid UNIQUE REFERENCES public.support_messages(id) ON DELETE CASCADE,
 sender_kind text NOT NULL CHECK (sender_kind IN ('customer','admin')), sender_id uuid,
 object_path text NOT NULL UNIQUE, file_name text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 160),
 content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
 size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_chat_images TO authenticated;
GRANT ALL ON public.support_chat_images TO service_role;
ALTER TABLE public.support_chat_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_chat_images_read ON public.support_chat_images FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id=conversation_id AND c.user_id=(SELECT auth.uid())) OR public.ml_has_role((SELECT auth.uid()),'admin')
);
CREATE INDEX support_chat_images_conversation_idx ON public.support_chat_images(conversation_id);
CREATE OR REPLACE FUNCTION public.support_post_image_message(_conversation uuid, _id uuid, _kind text, _sender uuid, _name text, _body text, _image uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted boolean; photo public.support_chat_images;
BEGIN
 PERFORM 1 FROM public.support_conversations WHERE id=_conversation FOR UPDATE;
 IF _image IS NOT NULL THEN
 SELECT * INTO photo FROM public.support_chat_images WHERE id=_image FOR UPDATE;
 IF NOT FOUND OR photo.conversation_id<>_conversation OR photo.sender_kind<>_kind OR photo.sender_id IS DISTINCT FROM _sender OR (photo.message_id IS NOT NULL AND photo.message_id<>_id) THEN RAISE EXCEPTION 'Invalid image'; END IF;
 END IF;
 inserted := public.support_post_message(_conversation,_id,_kind,_sender,_name,_body);
 IF _image IS NOT NULL THEN UPDATE public.support_chat_images SET message_id=_id WHERE id=_image; END IF;
 RETURN inserted;
END; $$;
REVOKE ALL ON FUNCTION public.support_post_image_message(uuid,uuid,text,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_post_image_message(uuid,uuid,text,uuid,text,text,uuid) TO service_role;
COMMENT ON TABLE public.support_chat_images IS 'Private server-authorized chat photos. Storage bucket has no anon/authenticated policies: upload and read use short-lived signed capabilities after conversation access checks.';