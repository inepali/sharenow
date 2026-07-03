import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "npm:@aws-sdk/client-s3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

        const body = await req.json();
        const { fileName, fileNames, prefix } = body;

        if (!fileName && (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) && !prefix) {
            throw new Error('fileName, fileNames array, or prefix is required');
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

        // 1. Prefix folder delete (purges all nested keys recursively)
        if (prefix) {
            let isTruncated = true;
            let continuationToken: string | undefined = undefined;

            while (isTruncated) {
                const listCommand = new ListObjectsV2Command({
                    Bucket: bucketName,
                    Prefix: prefix,
                    ContinuationToken: continuationToken,
                });

                const listResponse = await S3.send(listCommand);
                if (listResponse.Contents && listResponse.Contents.length > 0) {
                    const deleteCommand = new DeleteObjectsCommand({
                        Bucket: bucketName,
                        Delete: {
                            Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
                            Quiet: true,
                        },
                    });
                    await S3.send(deleteCommand);
                }

                isTruncated = listResponse.IsTruncated || false;
                continuationToken = listResponse.NextContinuationToken;
            }
        }

        // 2. Individual file list delete
        if (fileNames && fileNames.length > 0) {
            const command = new DeleteObjectsCommand({
                Bucket: bucketName,
                Delete: {
                    Objects: fileNames.map((name: string) => ({ Key: name })),
                    Quiet: false,
                },
            });
            await S3.send(command);
        } else if (fileName) {
            const command = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: fileName,
            });
            await S3.send(command);
        }

        return new Response(
            JSON.stringify({ success: true }),
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
