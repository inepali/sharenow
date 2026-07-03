import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, ListObjectsV2Command } from "npm:@aws-sdk/client-s3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { status: 200, headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Unauthorized');
        }

        const { prefix } = await req.json();

        if (!prefix) {
            throw new Error('prefix is required');
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

        // Use ListObjectsV2 to sum size and count
        let totalSize = 0;
        let photoCount = 0;
        let isTruncated = true;
        let continuationToken: string | undefined = undefined;

        while (isTruncated) {
            const command = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            });

            const response = await S3.send(command);

            if (response.Contents) {
                photoCount += response.Contents.length;
                totalSize += response.Contents.reduce((acc: number, obj: { Size?: number }) => acc + (obj.Size || 0), 0);
            }

            isTruncated = response.IsTruncated || false;
            continuationToken = response.NextContinuationToken;
        }

        return new Response(
            JSON.stringify({ totalSize, photoCount }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
