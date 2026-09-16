import torch, torchvision.transforms as T, io, os
from torchvision import models
from PIL import Image

CATEGORIES = ['road_damage','water_leak','electrical','garbage','graffiti','noise','emergency','other']
LABELS = {
    'road_damage':'Road / Pothole Damage','water_leak':'Water Leak / Flooding',
    'electrical':'Electrical Issue','garbage':'Garbage / Illegal Dumping',
    'graffiti':'Graffiti / Vandalism','noise':'Noise Complaint',
    'emergency':'Emergency','other':'Other',
}

class ImageClassifier:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.transform = T.Compose([
            T.Resize(256), T.CenterCrop(224), T.ToTensor(),
            T.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225]),
        ])
        model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
        model.fc = torch.nn.Sequential(torch.nn.Dropout(0.3), torch.nn.Linear(model.fc.in_features, len(CATEGORIES)))
        weights = os.path.join(os.path.dirname(__file__), 'civic_classifier.pth')
        if os.path.exists(weights):
            model.load_state_dict(torch.load(weights, map_location=self.device))
        model.eval()
        self.model = model.to(self.device)

    def predict(self, image_bytes: bytes) -> dict:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        t = self.transform(img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            probs = torch.softmax(self.model(t), dim=1)[0]
        idx = probs.argmax().item()
        return {
            'category': CATEGORIES[idx],
            'label': LABELS[CATEGORIES[idx]],
            'confidence': round(probs[idx].item() * 100, 1),
            'all_scores': {c: round(probs[i].item()*100,1) for i,c in enumerate(CATEGORIES)},
        }
