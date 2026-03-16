import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Unauthorized');
        }

        const { fileName, contentType } = await req.json();

        if (!fileName || !contentType) {
            throw new Error('fileName and contentType are required');
        }

        const accountId = Deno.env.get('R2_ACCOUNT_ID');
        const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
        const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
        const bucketName = Deno.env.get('R2_BUCKET_NAME');

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
            throw new Error('R2 configuration is missing');
        }

        const S3 = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });

        return new Response(
            JSON.stringify({ url: signedUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
