FROM public.ecr.aws/docker/library/python:3.13-rc-alpine
WORKDIR /src
ENV PYTHONUNBUFFERED=1
COPY ./src/requirements.txt /src/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /src/requirements.txt
COPY ./src/main.py /src
CMD [ "python", "main.py" ]
