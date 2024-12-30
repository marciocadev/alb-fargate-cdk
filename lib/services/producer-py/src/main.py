import os
import boto3
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse

sqs_client = boto3.client('sqs')
queue_url = os.environ['QUEUE_URL']

app = FastAPI() # swagger_ui_parameters={'syntaxHighlight': True})


@app.get("/")
def read_root():
    return PlainTextResponse("Python example inside a docker container")


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/message/{msg}")
async def send_msg(msg: str):
    response = sqs_client.send_message(
        QueueUrl=queue_url,
        MessageBody=msg
    )
    return response
