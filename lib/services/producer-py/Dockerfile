FROM public.ecr.aws/docker/library/python:3.13-rc-alpine
WORKDIR /src
COPY ./src/requirements.txt /src/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /src/requirements.txt
COPY ./src/main.py /src/main.py
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]