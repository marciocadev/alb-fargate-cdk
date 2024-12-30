import boto3
import os
import time
import threading
import uvicorn
from fastapi import FastAPI

sqs = boto3.client('sqs', region_name='us-east-1')
queue_url = os.environ['QUEUE_URL']

app = FastAPI() # swagger_ui_parameters={'syntaxHighlight': True})


def receive_messages():
    print("Thread receive_messages iniciada.")
    print(queue_url)
    while True:
        # Receba mensagens da fila
        response = sqs.receive_message(
            QueueUrl=queue_url,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=20
        )

        messages = response.get('Messages', [])
        for message in messages:
            print(f"Received message: {message['Body']}")
            # Processar a mensagem aqui

            # Excluir a mensagem da fila após o processamento
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=message['ReceiptHandle']
            )
            print(f"Deleted message: {message['MessageId']}")

        # Aguarde um pouco antes de verificar novamente
        time.sleep(5)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    print("Iniciando aplicação FastAPI.")
    thread = threading.Thread(target=receive_messages)
    thread.start()
    print("Thread receive_messages foi iniciada.")
    uvicorn.run(app, host="0.0.0.0", port=80)
